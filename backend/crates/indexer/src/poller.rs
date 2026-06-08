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
        Some(Value::Number(n)) => n.as_u64().unwrap_or(0),
        _ => 0,
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
        }
        tokio::time::sleep(interval).await;
    }
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
        if let Err(e) = process_event(state, ev).await {
            tracing::warn!("event {} failed: {e:#}", ev.short_type());
        }
    }

    if let Some(c) = page.next_cursor {
        db::set_cursor(&state.pool, &c.tx_digest, &c.event_seq).await?;
    }
    Ok(())
}

async fn process_event(state: &AppState, ev: &SuiEvent) -> anyhow::Result<()> {
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
