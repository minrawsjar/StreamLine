//! Polls Sui for StreamLine events and folds them into Postgres, advancing a
//! persisted cursor so it resumes across restarts. Also fans live updates out
//! to WebSocket clients.

use std::time::Duration;

use serde_json::Value;
use streamline_core::events::*;
use streamline_core::sui::{EventId, SuiClient, SuiEvent};

use crate::{db, state::AppState, state::LiveUpdate};

/// Move u64s arrive as JSON strings; numbers may also appear. Read either.
fn u64_field(v: &Value, key: &str) -> u64 {
    match v.get(key) {
        Some(Value::String(s)) => s.parse().unwrap_or(0),
        Some(Value::Number(n)) => n.as_u64().or_else(|| n.as_f64().map(|f| f as u64)).unwrap_or(0),
        _ => 0,
    }
}

fn state_label(code: u64) -> &'static str {
    match code {
        0 => "locked",
        1 => "pending_review",
        2 => "dripping",
        3 => "paused",
        4 => "done",
        _ => "locked",
    }
}

fn str_field(v: &Value, key: &str) -> String {
    v.get(key)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string()
}

pub async fn run(state: AppState) {
    let interval = Duration::from_millis(state.config.poll_interval_ms);
    let client = SuiClient::new(&state.config.sui_rpc_url);

    loop {
        if state.config.has_package() {
            if let Err(e) = poll_once(&state, &client).await {
                tracing::warn!("poll error: {e:#}");
            }
            if let Err(e) = backfill_missing(&state, &client).await {
                tracing::warn!("backfill sweep error: {e:#}");
            }
        }
        tokio::time::sleep(interval).await;
    }
}

/// Sweep streams that are missing coin type / timing and fill them from chain.
/// Idempotent and self-limiting: once every row has metadata it does nothing.
async fn backfill_missing(state: &AppState, client: &SuiClient) -> anyhow::Result<()> {
    for id in db::streams_missing_meta(&state.pool).await? {
        if let Err(e) = backfill_meta(state, client, &id).await {
            tracing::warn!("backfill meta for {id} failed: {e:#}");
        }
    }
    for id in db::streams_needing_state_sync(&state.pool).await? {
        if let Err(e) = sync_stream_state(state, client, &id).await {
            tracing::warn!("state sync for {id} failed: {e:#}");
        }
    }
    Ok(())
}

async fn poll_once(state: &AppState, client: &SuiClient) -> anyhow::Result<()> {
    let cursor = db::get_cursor(&state.pool).await?.map(|(d, s)| EventId {
        tx_digest: d,
        event_seq: s,
    });

    let page = client
        .query_events(
            &state.config.package_id,
            &state.config.module,
            cursor.as_ref(),
            50,
        )
        .await?;

    for ev in &page.data {
        if let Err(e) = process_event(state, client, ev).await {
            tracing::warn!("event {} failed: {e:#}", ev.short_type());
        }
    }

    if let Some(c) = page.next_cursor {
        db::set_cursor(&state.pool, &c.tx_digest, &c.event_seq).await?;
    }
    Ok(())
}

async fn process_event(
    state: &AppState,
    client: &SuiClient,
    ev: &SuiEvent,
) -> anyhow::Result<()> {
    let j = &ev.parsed_json;
    let now = ev
        .timestamp_ms
        .as_deref()
        .and_then(|s| s.parse::<i64>().ok())
        .unwrap_or(0);

    match ev.short_type() {
        EV_CREATED => {
            let e = StreamCreated {
                stream_id: str_field(j, "stream_id"),
                sender: str_field(j, "sender"),
                freelancer: str_field(j, "freelancer"),
                total: u64_field(j, "total"),
                n_milestones: u64_field(j, "n_milestones"),
            };
            db::upsert_created(&state.pool, &e, now).await?;
            // The event omits the coin type + timing; read them off the object so
            // the keeper can settle and the UI can show live accrual.
            if let Err(err) = backfill_meta(state, client, &e.stream_id).await {
                tracing::warn!("backfill meta for {} failed: {err:#}", e.stream_id);
            }
        }
        EV_MILESTONE_RAISED => {
            let e = MilestoneRaised {
                stream_id: str_field(j, "stream_id"),
                milestone_index: u64_field(j, "milestone_index"),
                review_deadline_ms: u64_field(j, "review_deadline_ms"),
            };
            db::set_pending(&state.pool, &e).await?;
            state.publish(LiveUpdate::State {
                stream_id: e.stream_id,
                state: "pending_review".into(),
            });
        }
        EV_MILESTONE_APPROVED => {
            let e = MilestoneApproved {
                stream_id: str_field(j, "stream_id"),
                milestone_index: u64_field(j, "milestone_index"),
            };
            db::set_dripping(&state.pool, &e).await?;
            state.publish(LiveUpdate::State {
                stream_id: e.stream_id,
                state: "dripping".into(),
            });
        }
        EV_DRIPPED => {
            let e = StreamDripped {
                stream_id: str_field(j, "stream_id"),
                amount: u64_field(j, "amount"),
                timestamp_ms: u64_field(j, "timestamp_ms").max(now as u64),
            };
            db::apply_drip(&state.pool, &e, &ev.id.tx_digest).await?;
            // Milestone completion (→ locked + bump index) happens inside `drip`
            // with no separate event — re-read the object to stay in sync.
            if let Err(err) = sync_stream_state(state, client, &e.stream_id).await {
                tracing::warn!("state sync after drip {}: {err:#}", e.stream_id);
            }
            state.publish(LiveUpdate::Drip {
                stream_id: e.stream_id,
                amount: e.amount as i64,
                timestamp_ms: e.timestamp_ms as i64,
            });
        }
        EV_PAUSED => {
            let id = str_field(j, "stream_id");
            db::set_paused(&state.pool, &id).await?;
            state.publish(LiveUpdate::State {
                stream_id: id,
                state: "paused".into(),
            });
        }
        other => tracing::debug!("ignoring event {other}"),
    }
    Ok(())
}

/// Read the Stream object and persist the fields the creation event omits:
/// the coin type (the `T` in `Stream<T>`) plus the duration / drip interval.
async fn backfill_meta(
    state: &AppState,
    client: &SuiClient,
    stream_id: &str,
) -> anyhow::Result<()> {
    let obj = client.get_object(stream_id).await?;
    let data = &obj["data"];

    let type_str = data["type"].as_str().unwrap_or_default();
    let coin_type = type_param(type_str).unwrap_or_default();

    let fields = &data["content"]["fields"];
    let duration_ms = u64_field(fields, "duration_ms") as i64;
    let drip_interval_ms = u64_field(fields, "drip_interval_ms") as i64;

    db::set_stream_meta(&state.pool, stream_id, &coin_type, duration_ms, drip_interval_ms)
        .await?;
    Ok(())
}

/// Read `state` + `current_milestone` from chain and persist. Needed because
/// milestone completion happens inside `drip` without its own event.
async fn sync_stream_state(
    state: &AppState,
    client: &SuiClient,
    stream_id: &str,
) -> anyhow::Result<()> {
    let obj = client.get_object(stream_id).await?;
    let fields = &obj["data"]["content"]["fields"];
    let code = u64_field(fields, "state");
    let milestone = u64_field(fields, "current_milestone") as i64;
    let label = state_label(code);
    db::set_stream_state(&state.pool, stream_id, label, milestone).await?;
    state.publish(LiveUpdate::State {
        stream_id: stream_id.into(),
        state: label.into(),
    });
    Ok(())
}

/// Extract `T` from `0x..::stream::Stream<T>` (the innermost generic argument).
fn type_param(type_str: &str) -> Option<String> {
    let start = type_str.find('<')?;
    let end = type_str.rfind('>')?;
    if end <= start + 1 {
        return None;
    }
    Some(type_str[start + 1..end].trim().to_string())
}
