-- Remove NORMAL style (0) leaderboards from CLIMB gamemodes
-- CLIMB_MOM (4), CLIMB_KZT (5), and CLIMB_16 (6) only use PRO (8) and TELEPORT (9) styles
-- The NORMAL style leaderboards are no longer needed and should be removed

-- First, migrate all existing NORMAL style runs to TELEPORT style
-- This preserves the run data by moving it to the TELEPORT leaderboards
UPDATE "LeaderboardRun"
SET "style" = 9  -- TELEPORT
WHERE "gamemode" IN (4, 5, 6)  -- CLIMB_MOM, CLIMB_KZT, CLIMB_16
  AND "style" = 0;             -- NORMAL style

-- Now delete the empty NORMAL style leaderboards
DELETE FROM "Leaderboard"
WHERE "gamemode" IN (4, 5, 6)  -- CLIMB_MOM, CLIMB_KZT, CLIMB_16
  AND "style" = 0;             -- NORMAL style
