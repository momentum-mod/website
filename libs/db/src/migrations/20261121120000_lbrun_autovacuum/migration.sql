-- Vacuum after ~1% of rows change so index-only scans of leaderboards rarely need heap fetches
ALTER TABLE "LeaderboardRun" SET (
    autovacuum_vacuum_scale_factor = 0.01,
    autovacuum_vacuum_insert_scale_factor = 0.01
);
