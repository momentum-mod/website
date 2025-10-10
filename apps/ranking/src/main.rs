use anyhow::Result;
use dotenvy::dotenv;
use std::env;
use tracing::{info, Level};
use tracing_subscriber;

mod ranking;
mod xp_calculator;

use ranking::RankingService;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt().with_max_level(Level::INFO).init();

    dotenv().ok();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let valkey_host = env::var("VALKEY_HOST").unwrap_or("localhost".to_string());
    let valkey_port = env::var("VALKEY_PORT").unwrap_or("6379".to_string());

    info!("Starting Momentum Ranking Service");

    let service = RankingService::new(
        &database_url,
        &format!("redis://{}:{}", valkey_host, valkey_port),
    )
    .await?;

    service.calculate_and_store_rankings().await?;

    info!("Ranking calculation completed successfully");
    Ok(())
}
