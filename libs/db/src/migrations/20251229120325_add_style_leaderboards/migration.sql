-- Add leaderboards for all valid style combinations from gamemode-styles.map.ts
-- NORMAL style leaderboards already exist for all gamemodes, so they are skipped

-- For each existing leaderboard with NORMAL style (0), create corresponding style leaderboards
-- based on the valid styles defined in gamemode-styles.map.ts:
--   SURF (1): REAL_HALF_SIDEWAYS (2), SIDEWAYS (3), BACKWARDS (7)
--   BHOP (2): HALF_SIDEWAYS (1), SIDEWAYS (3), W_ONLY (4), AD_ONLY (5)
--   CLIMB_MOM (4), CLIMB_KZT (5), CLIMB_16 (6): TELEPORT (8)

DO $$
DECLARE
    leaderboard_record RECORD;
BEGIN
    -- Loop through all existing NORMAL style leaderboards
    FOR leaderboard_record IN 
        SELECT DISTINCT "mapID", "gamemode", "trackType", "trackNum", "tier", "linear", "type", "tags"
        FROM "Leaderboard" 
        WHERE "style" = 0
    LOOP
        -- SURF (gamemode = 1): Add REAL_HALF_SIDEWAYS (2), SIDEWAYS (3), and BACKWARDS (7)
        IF leaderboard_record."gamemode" = 1 THEN
            -- REAL_HALF_SIDEWAYS
            INSERT INTO "Leaderboard" ("mapID", "gamemode", "trackType", "trackNum", "style", "tier", "linear", "type", "tags")
            SELECT 
                leaderboard_record."mapID",
                leaderboard_record."gamemode",
                leaderboard_record."trackType",
                leaderboard_record."trackNum",
                2,  -- REAL_HALF_SIDEWAYS
                leaderboard_record."tier",
                leaderboard_record."linear",
                leaderboard_record."type",
                leaderboard_record."tags"
            WHERE NOT EXISTS (
                SELECT 1 FROM "Leaderboard" 
                WHERE "mapID" = leaderboard_record."mapID" 
                AND "gamemode" = leaderboard_record."gamemode" 
                AND "trackType" = leaderboard_record."trackType"
                AND "trackNum" = leaderboard_record."trackNum"
                AND "style" = 2
            );
            
            -- SIDEWAYS
            INSERT INTO "Leaderboard" ("mapID", "gamemode", "trackType", "trackNum", "style", "tier", "linear", "type", "tags")
            SELECT 
                leaderboard_record."mapID",
                leaderboard_record."gamemode",
                leaderboard_record."trackType",
                leaderboard_record."trackNum",
                3,  -- SIDEWAYS
                leaderboard_record."tier",
                leaderboard_record."linear",
                leaderboard_record."type",
                leaderboard_record."tags"
            WHERE NOT EXISTS (
                SELECT 1 FROM "Leaderboard" 
                WHERE "mapID" = leaderboard_record."mapID" 
                AND "gamemode" = leaderboard_record."gamemode" 
                AND "trackType" = leaderboard_record."trackType"
                AND "trackNum" = leaderboard_record."trackNum"
                AND "style" = 3
            );

             -- BACKWARDS
            INSERT INTO "Leaderboard" ("mapID", "gamemode", "trackType", "trackNum", "style", "tier", "linear", "type", "tags")
            SELECT 
                leaderboard_record."mapID",
                leaderboard_record."gamemode",
                leaderboard_record."trackType",
                leaderboard_record."trackNum",
                7,  -- BACKWARDS
                leaderboard_record."tier",
                leaderboard_record."linear",
                leaderboard_record."type",
                leaderboard_record."tags"
            WHERE NOT EXISTS (
                SELECT 1 FROM "Leaderboard" 
                WHERE "mapID" = leaderboard_record."mapID" 
                AND "gamemode" = leaderboard_record."gamemode" 
                AND "trackType" = leaderboard_record."trackType"
                AND "trackNum" = leaderboard_record."trackNum"
                AND "style" = 7
            );
        END IF;
        
        -- BHOP (gamemode = 2): Add HALF_SIDEWAYS (1), SIDEWAYS (3), W_ONLY (4), AD_ONLY (5)
        IF leaderboard_record."gamemode" = 2 THEN
            -- HALF_SIDEWAYS
            INSERT INTO "Leaderboard" ("mapID", "gamemode", "trackType", "trackNum", "style", "tier", "linear", "type", "tags")
            SELECT 
                leaderboard_record."mapID",
                leaderboard_record."gamemode",
                leaderboard_record."trackType",
                leaderboard_record."trackNum",
                1,  -- HALF_SIDEWAYS
                leaderboard_record."tier",
                leaderboard_record."linear",
                leaderboard_record."type",
                leaderboard_record."tags"
            WHERE NOT EXISTS (
                SELECT 1 FROM "Leaderboard" 
                WHERE "mapID" = leaderboard_record."mapID" 
                AND "gamemode" = leaderboard_record."gamemode" 
                AND "trackType" = leaderboard_record."trackType"
                AND "trackNum" = leaderboard_record."trackNum"
                AND "style" = 1
            );
            
            -- SIDEWAYS
            INSERT INTO "Leaderboard" ("mapID", "gamemode", "trackType", "trackNum", "style", "tier", "linear", "type", "tags")
            SELECT 
                leaderboard_record."mapID",
                leaderboard_record."gamemode",
                leaderboard_record."trackType",
                leaderboard_record."trackNum",
                3,  -- SIDEWAYS
                leaderboard_record."tier",
                leaderboard_record."linear",
                leaderboard_record."type",
                leaderboard_record."tags"
            WHERE NOT EXISTS (
                SELECT 1 FROM "Leaderboard" 
                WHERE "mapID" = leaderboard_record."mapID" 
                AND "gamemode" = leaderboard_record."gamemode" 
                AND "trackType" = leaderboard_record."trackType"
                AND "trackNum" = leaderboard_record."trackNum"
                AND "style" = 3
            );
            
            -- W_ONLY
            INSERT INTO "Leaderboard" ("mapID", "gamemode", "trackType", "trackNum", "style", "tier", "linear", "type", "tags")
            SELECT 
                leaderboard_record."mapID",
                leaderboard_record."gamemode",
                leaderboard_record."trackType",
                leaderboard_record."trackNum",
                4,  -- W_ONLY
                leaderboard_record."tier",
                leaderboard_record."linear",
                leaderboard_record."type",
                leaderboard_record."tags"
            WHERE NOT EXISTS (
                SELECT 1 FROM "Leaderboard" 
                WHERE "mapID" = leaderboard_record."mapID" 
                AND "gamemode" = leaderboard_record."gamemode" 
                AND "trackType" = leaderboard_record."trackType"
                AND "trackNum" = leaderboard_record."trackNum"
                AND "style" = 4
            );
            
            -- AD_ONLY
            INSERT INTO "Leaderboard" ("mapID", "gamemode", "trackType", "trackNum", "style", "tier", "linear", "type", "tags")
            SELECT 
                leaderboard_record."mapID",
                leaderboard_record."gamemode",
                leaderboard_record."trackType",
                leaderboard_record."trackNum",
                5,  -- AD_ONLY
                leaderboard_record."tier",
                leaderboard_record."linear",
                leaderboard_record."type",
                leaderboard_record."tags"
            WHERE NOT EXISTS (
                SELECT 1 FROM "Leaderboard" 
                WHERE "mapID" = leaderboard_record."mapID" 
                AND "gamemode" = leaderboard_record."gamemode" 
                AND "trackType" = leaderboard_record."trackType"
                AND "trackNum" = leaderboard_record."trackNum"
                AND "style" = 5
            );
        END IF;

        -- CLIMB_MOM (4), CLIMB_KZT (5), CLIMB_16 (6): Add PRO (8)
        IF leaderboard_record."gamemode" IN (4, 5, 6) THEN
            INSERT INTO "Leaderboard" ("mapID", "gamemode", "trackType", "trackNum", "style", "tier", "linear", "type", "tags")
            SELECT 
                leaderboard_record."mapID",
                leaderboard_record."gamemode",
                leaderboard_record."trackType",
                leaderboard_record."trackNum",
                8,  -- PRO
                leaderboard_record."tier",
                leaderboard_record."linear",
                leaderboard_record."type",
                leaderboard_record."tags"
            WHERE NOT EXISTS (
                SELECT 1 FROM "Leaderboard" 
                WHERE "mapID" = leaderboard_record."mapID" 
                AND "gamemode" = leaderboard_record."gamemode" 
                AND "trackType" = leaderboard_record."trackType"
                AND "trackNum" = leaderboard_record."trackNum"
                AND "style" = 8
            );
        END IF;
        
        -- CLIMB_MOM (4), CLIMB_KZT (5), CLIMB_16 (6): Add TELEPORT (9)
        IF leaderboard_record."gamemode" IN (4, 5, 6) THEN
            INSERT INTO "Leaderboard" ("mapID", "gamemode", "trackType", "trackNum", "style", "tier", "linear", "type", "tags")
            SELECT 
                leaderboard_record."mapID",
                leaderboard_record."gamemode",
                leaderboard_record."trackType",
                leaderboard_record."trackNum",
                9,  -- TELEPORT
                leaderboard_record."tier",
                leaderboard_record."linear",
                leaderboard_record."type",
                leaderboard_record."tags"
            WHERE NOT EXISTS (
                SELECT 1 FROM "Leaderboard" 
                WHERE "mapID" = leaderboard_record."mapID" 
                AND "gamemode" = leaderboard_record."gamemode" 
                AND "trackType" = leaderboard_record."trackType"
                AND "trackNum" = leaderboard_record."trackNum"
                AND "style" = 9
            );
        END IF;
    END LOOP;
END $$;
