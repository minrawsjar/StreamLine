//! Minimal Sui JSON-RPC client over `reqwest`. We deliberately avoid the heavy
//! `sui-sdk` git dependency — the indexer only needs `suix_queryEvents` and a
//! couple of object reads, which are simple JSON-RPC calls.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Debug, thiserror::Error)]
pub enum SuiError {
    #[error("http error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("rpc error {code}: {message}")]
    Rpc { code: i64, message: String },
    #[error("decode error: {0}")]
    Decode(#[from] serde_json::Error),
}

pub type Result<T> = std::result::Result<T, SuiError>;

/// Cursor identifying a position in the event stream.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventId {
    #[serde(rename = "txDigest")]
    pub tx_digest: String,
    #[serde(rename = "eventSeq")]
    pub event_seq: String,
}

/// A single Move event as returned by `suix_queryEvents`.
#[derive(Debug, Clone, Deserialize)]
pub struct SuiEvent {
    pub id: EventId,
    #[serde(rename = "packageId")]
    pub package_id: String,
    #[serde(rename = "transactionModule")]
    pub transaction_module: String,
    pub sender: String,
    #[serde(rename = "type")]
    pub event_type: String,
    #[serde(rename = "parsedJson")]
    pub parsed_json: Value,
    #[serde(rename = "timestampMs")]
    pub timestamp_ms: Option<String>,
}

impl SuiEvent {
    /// The short event name, e.g. `StreamCreated` from `<pkg>::stream::StreamCreated`.
    pub fn short_type(&self) -> &str {
        self.event_type.rsplit("::").next().unwrap_or(&self.event_type)
    }
}

/// A page of events with pagination metadata.
#[derive(Debug, Clone, Deserialize)]
pub struct EventPage {
    pub data: Vec<SuiEvent>,
    #[serde(rename = "nextCursor")]
    pub next_cursor: Option<EventId>,
    #[serde(rename = "hasNextPage")]
    pub has_next_page: bool,
}

#[derive(Clone)]
pub struct SuiClient {
    http: reqwest::Client,
    url: String,
}

impl SuiClient {
    pub fn new(url: impl Into<String>) -> Self {
        Self {
            http: reqwest::Client::new(),
            url: url.into(),
        }
    }

    /// Issue a JSON-RPC call and deserialize the `result` field.
    pub async fn rpc<T: for<'de> Deserialize<'de>>(
        &self,
        method: &str,
        params: Value,
    ) -> Result<T> {
        let body = json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params,
        });
        let resp: Value = self
            .http
            .post(&self.url)
            .json(&body)
            .send()
            .await?
            .json()
            .await?;

        if let Some(err) = resp.get("error") {
            return Err(SuiError::Rpc {
                code: err.get("code").and_then(Value::as_i64).unwrap_or(0),
                message: err
                    .get("message")
                    .and_then(Value::as_str)
                    .unwrap_or("unknown")
                    .to_string(),
            });
        }
        let result = resp.get("result").cloned().unwrap_or(Value::Null);
        Ok(serde_json::from_value(result)?)
    }

    /// Query events emitted by a given package + module, oldest first.
    pub async fn query_events(
        &self,
        package: &str,
        module: &str,
        cursor: Option<&EventId>,
        limit: u32,
    ) -> Result<EventPage> {
        let filter = json!({ "MoveModule": { "package": package, "module": module } });
        let cursor = cursor
            .map(|c| json!({ "txDigest": c.tx_digest, "eventSeq": c.event_seq }))
            .unwrap_or(Value::Null);
        self.rpc(
            "suix_queryEvents",
            json!([filter, cursor, limit, false]),
        )
        .await
    }

    /// Fetch a single object with its content (BCS-decoded fields as JSON).
    pub async fn get_object(&self, id: &str) -> Result<Value> {
        self.rpc(
            "sui_getObject",
            json!([id, { "showContent": true, "showType": true }]),
        )
        .await
    }
}
