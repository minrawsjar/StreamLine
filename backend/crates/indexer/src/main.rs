//! StreamLine indexer — placeholder entrypoint (built out next).

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();
    tracing::info!("streamline-indexer starting");
    Ok(())
}
