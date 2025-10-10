use anyhow::{Context, Result};
use sqlx::{PgPool, Row};
use std::collections::HashMap;
use tracing::{info, warn};

use crate::xp_calculator::XpCalculator;

pub struct RankingService {
    db_pool: PgPool,
    redis_client: redis::Client,
    xp_calculator: XpCalculator,
}

type UserID = i32;
type Gamemode = i16;

// TODO NEXT: Query is crazy slow. Slightly faster doing this array_agg stuff than SELECTing mapID,
// gamemode, trackType, trackNum, style for every row, which we'd need to include to group each
// leaderboard we get back, to determine totally number of completions.
// Main takeaway from this, by *far* the most time spent is spent within Postgres.
static GET_LEADERBOARD_QUERY: &str = r#"
    SELECT
        l."gamemode",
        array_agg(lr."userID" ORDER BY lr."rank") AS user_ids
    FROM "Leaderboard" l
    JOIN "LeaderboardRun" lr ON
        l."mapID" = lr."mapID"
        AND l."gamemode" = lr."gamemode"
        AND l."trackType" = lr."trackType"
        AND l."trackNum" = lr."trackNum"
        AND l."style" = lr."style"
    WHERE l.type = 0
    GROUP BY l."mapID", l."gamemode", l."trackType", l."trackNum", l."style"
    HAVING count(lr."userID") > 1
"#;

impl RankingService {
    pub async fn new(database_url: &str, valkey_url: &str) -> Result<Self> {
        // Initialize database connection
        let db_pool = PgPool::connect(database_url)
            .await
            .context("Failed to connect to PostgreSQL")?;

        info!("PostgreSQL connection established");

        // Initialize Redis/Valkey connection
        let redis_client =
            redis::Client::open(valkey_url).context("Failed to create Redis client")?;

        info!("Valkey connection established");

        Ok(Self {
            db_pool,
            redis_client,
            xp_calculator: XpCalculator::new(),
        })
    }

    pub async fn calculate_and_store_rankings(&self) -> Result<()> {
        info!("Starting ranked XP calculation...");

        let start_time = std::time::Instant::now();

        // Fetch all ranked leaderboards with their runs

        let rows = sqlx::query(GET_LEADERBOARD_QUERY)
            .fetch_all(&self.db_pool)
            .await
            .context("Failed to fetch ranked leaderboards")?;

        let duration = start_time.elapsed();
        info!("Fetched {} runs from DB in {:?}", rows.len(), duration);

        // Get Redis connection
        let mut redis_conn = self
            .redis_client
            .get_async_connection()
            .await
            .context("Failed to get Redis connection")?;

        let mut total_runs_processed = 0;
        let mut user_xp_gains: HashMap<(Gamemode, UserID), i32> = HashMap::new();

        // Process each leaderboard
        for row in rows {
            let gamemode: i16 = row.get("gamemode");
            let user_ids: Vec<i32> = row.get("user_ids");

            let completions = user_ids.len() as i32;

            if completions == 0 {
                continue;
            }

            // Process each run in the leaderboard
            for (index, &user_id) in user_ids.iter().enumerate() {
                let rank_xp_gain = self
                    .xp_calculator
                    .get_rank_xp_for_rank((index + 1).try_into().unwrap(), completions);

                // Accumulate XP for this user/gamemode combination
                let key = (gamemode, user_id);
                *user_xp_gains.entry(key).or_insert(0) += rank_xp_gain.rank_xp;

                total_runs_processed += 1;
            }
        }

        info!(
            "Processed {} runs across {} unique user/gamemode combinations",
            total_runs_processed,
            user_xp_gains.len()
        );

        // Batch store XP gains in Redis
        let mut batch_count = 0;
        const BATCH_SIZE: usize = 1000;
        let mut pipe = redis::pipe();

        for ((gamemode, user_id), total_xp) in user_xp_gains {
            let key = format!("rank:{}:{}", gamemode, user_id);
            pipe.set(&key, total_xp);
            batch_count += 1;

            // Execute batch when we hit batch size
            if batch_count >= BATCH_SIZE {
                pipe.query_async(&mut redis_conn)
                    .await
                    .context("Failed to execute Redis batch")?;
                pipe = redis::pipe();
                batch_count = 0;
            }
        }

        // Execute remaining batch
        if batch_count > 0 {
            pipe.query_async(&mut redis_conn)
                .await
                .context("Failed to execute final Redis batch")?;
        }

        let duration = start_time.elapsed();
        info!("Ranked XP calculation completed in {:?}", duration);
        info!("Processed {} total runs", total_runs_processed);

        Ok(())
    }
}
