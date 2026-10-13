-- A map with leaderboards for the run session tests (rs-race.mjs), which can
-- only create sessions on leaderboards that exist. Gamemode 2 (Bhop), main
-- track plus three stages.
INSERT INTO "MMap" (id, name, status, "updatedAt") VALUES (1, 'rs_test', 0, now());
INSERT INTO "Leaderboard" ("mapID", gamemode, "trackType", "trackNum", style, type)
VALUES (1, 2, 0, 1, 0, 0), (1, 2, 1, 1, 0, 0), (1, 2, 1, 2, 0, 0), (1, 2, 1, 3, 0, 0);
