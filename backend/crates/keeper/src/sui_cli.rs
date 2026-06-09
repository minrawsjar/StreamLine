//! Thin wrapper over the `sui` CLI for submitting settlement transactions.
//!
//! We shell out rather than pull in the heavy `sui-sdk` crate: the CLI already
//! manages the keeper's keystore, gas-coin selection, signing, and submission.
//! The keeper's address pays gas and is reimbursed by the 1 bps on-chain tip, so
//! settlement stays self-sustaining while end users remain fully gasless.

use anyhow::{bail, Result};
use tokio::process::Command;

use crate::config::Config;

/// Call `stream::drip<T>(stream, clock)`. Returns the transaction digest.
pub async fn drip(cfg: &Config, coin_type: &str, stream_id: &str) -> Result<String> {
    call(cfg, "drip", coin_type, stream_id).await
}

/// Call `stream::auto_approve<T>(stream, clock)` once the review window lapses.
pub async fn auto_approve(cfg: &Config, coin_type: &str, stream_id: &str) -> Result<String> {
    call(cfg, "auto_approve", coin_type, stream_id).await
}

async fn call(cfg: &Config, function: &str, coin_type: &str, stream_id: &str) -> Result<String> {
    let output = Command::new(&cfg.sui_bin)
        .arg("client")
        .arg("call")
        .arg("--package")
        .arg(&cfg.package_id)
        .arg("--module")
        .arg(&cfg.module)
        .arg("--function")
        .arg(function)
        .arg("--type-args")
        .arg(coin_type)
        .arg("--args")
        .arg(stream_id)
        .arg(&cfg.clock_id)
        .arg("--gas-budget")
        .arg(cfg.gas_budget.to_string())
        .arg("--json")
        .output()
        .await?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        bail!("sui {function} failed: {}", stderr.trim());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let digest = serde_json::from_str::<serde_json::Value>(&stdout)
        .ok()
        .and_then(|v| v.get("digest").and_then(|d| d.as_str()).map(str::to_string))
        .unwrap_or_else(|| "<unknown digest>".to_string());
    Ok(digest)
}
