-- Add leaderboards for the new BHOP_STAMINA gamemode (14)
-- For each distinct (mapID, trackType, trackNum) that already has any leaderboard,
-- create BHOP_STAMINA leaderboards (hidden by default) for all compatible styles:
--   BUFFERED_JUMP (10), SCROLL (11), _400VELBUFFERED (12), _400VELSCROLL (13)

DO $$
DECLARE
    leaderboard_record RECORD;
BEGIN
    FOR leaderboard_record IN
        SELECT DISTINCT "mapID", "trackType", "trackNum"
        FROM "Leaderboard"
    LOOP
        -- BUFFERED_JUMP (10)
        INSERT INTO "Leaderboard" ("mapID", "gamemode", "trackType", "trackNum", "style", "tier", "linear", "type", "tags")
        SELECT
            leaderboard_record."mapID",
            14,  -- BHOP_STAMINA
            leaderboard_record."trackType",
            leaderboard_record."trackNum",
            10,  -- BUFFERED_JUMP
            NULL,  -- tier
            NULL,  -- linear
            2,     -- LeaderboardType.HIDDEN
            ARRAY[]::smallint[]
        WHERE NOT EXISTS (
            SELECT 1 FROM "Leaderboard"
            WHERE "mapID" = leaderboard_record."mapID"
              AND "gamemode" = 14
              AND "trackType" = leaderboard_record."trackType"
              AND "trackNum" = leaderboard_record."trackNum"
              AND "style" = 10
        );

        -- SCROLL (11)
        INSERT INTO "Leaderboard" ("mapID", "gamemode", "trackType", "trackNum", "style", "tier", "linear", "type", "tags")
        SELECT
            leaderboard_record."mapID",
            14,  -- BHOP_STAMINA
            leaderboard_record."trackType",
            leaderboard_record."trackNum",
            11,  -- SCROLL
            NULL,  -- tier
            NULL,  -- linear
            2,     -- LeaderboardType.HIDDEN
            ARRAY[]::smallint[]
        WHERE NOT EXISTS (
            SELECT 1 FROM "Leaderboard"
            WHERE "mapID" = leaderboard_record."mapID"
              AND "gamemode" = 14
              AND "trackType" = leaderboard_record."trackType"
              AND "trackNum" = leaderboard_record."trackNum"
              AND "style" = 11
        );

        -- _400VELBUFFERED (12)
        INSERT INTO "Leaderboard" ("mapID", "gamemode", "trackType", "trackNum", "style", "tier", "linear", "type", "tags")
        SELECT
            leaderboard_record."mapID",
            14,  -- BHOP_STAMINA
            leaderboard_record."trackType",
            leaderboard_record."trackNum",
            12,  -- _400VELBUFFERED
            NULL,  -- tier
            NULL,  -- linear
            2,     -- LeaderboardType.HIDDEN
            ARRAY[]::smallint[]
        WHERE NOT EXISTS (
            SELECT 1 FROM "Leaderboard"
            WHERE "mapID" = leaderboard_record."mapID"
              AND "gamemode" = 14
              AND "trackType" = leaderboard_record."trackType"
              AND "trackNum" = leaderboard_record."trackNum"
              AND "style" = 12
        );

        -- _400VELSCROLL (13)
        INSERT INTO "Leaderboard" ("mapID", "gamemode", "trackType", "trackNum", "style", "tier", "linear", "type", "tags")
        SELECT
            leaderboard_record."mapID",
            14,  -- BHOP_STAMINA
            leaderboard_record."trackType",
            leaderboard_record."trackNum",
            13,  -- _400VELSCROLL
            NULL,  -- tier
            NULL,  -- linear
            2,     -- LeaderboardType.HIDDEN
            ARRAY[]::smallint[]
        WHERE NOT EXISTS (
            SELECT 1 FROM "Leaderboard"
            WHERE "mapID" = leaderboard_record."mapID"
              AND "gamemode" = 14
              AND "trackType" = leaderboard_record."trackType"
              AND "trackNum" = leaderboard_record."trackNum"
              AND "style" = 13
        );
    END LOOP;
END $$;
