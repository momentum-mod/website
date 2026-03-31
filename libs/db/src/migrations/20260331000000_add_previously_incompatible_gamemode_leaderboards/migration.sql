-- The IncompatibleGamemodes map has been removed. Previously it caused
-- getCompatibleLeaderboards() to skip generating leaderboards for certain
-- gamemode pairs. This migration adds those previously-excluded leaderboards
-- for all existing maps, using type HIDDEN (2).
--
-- CLIMB_MOM (4) remains disabled and is intentionally excluded here.
--
-- Previously excluded pairs (source_gamemode -> target_gamemode):
--   SURF      (1) -> BHOP (2), BHOP_HL1 (3), CLIMB_KZT (5)
--   BHOP      (2) -> SURF (1), CLIMB_KZT (5)
--   BHOP_HL1  (3) -> SURF (1), CLIMB_KZT (5)
--   CLIMB_KZT (5) -> SURF (1), BHOP (2), BHOP_HL1 (3)
--   CLIMB_16  (6) -> SURF (1), BHOP (2), BHOP_HL1 (3)
--
-- Gamemode styles:
--   SURF      (1): NORMAL(0), SURF_HALF_SIDEWAYS(2), SIDEWAYS(3), BACKWARDS(7)
--   BHOP      (2): NORMAL(0), BHOP_HALF_SIDEWAYS(1), SIDEWAYS(3), W_ONLY(4), AD_ONLY(5)
--   BHOP_HL1  (3): NORMAL(0)
--   CLIMB_KZT (5): PRO(8), TELEPORT(9)

INSERT INTO "Leaderboard" ("mapID", "gamemode", "trackType", "trackNum", "style", "type", "tier", "linear", "tags")
SELECT DISTINCT
    lb."mapID",
    mapping.target_gamemode AS "gamemode",
    lb."trackType",
    lb."trackNum",
    mapping.target_style    AS "style",
    2                       AS "type",  -- LeaderboardType.HIDDEN
    NULL::smallint          AS "tier",
    lb."linear",
    ARRAY[]::smallint[]     AS "tags"
FROM "Leaderboard" lb
JOIN (VALUES
    -- SURF (1) previously excluded BHOP (2), BHOP_HL1 (3), CLIMB_KZT (5)
    (1, 2, 0), (1, 2, 1), (1, 2, 3), (1, 2, 4), (1, 2, 5),  -- SURF -> BHOP (all 5 styles)
    (1, 3, 0),                                                  -- SURF -> BHOP_HL1
    (1, 5, 8), (1, 5, 9),                                       -- SURF -> CLIMB_KZT

    -- BHOP (2) previously excluded SURF (1), CLIMB_KZT (5)
    (2, 1, 0), (2, 1, 2), (2, 1, 3), (2, 1, 7),               -- BHOP -> SURF (all 4 styles)
    (2, 5, 8), (2, 5, 9),                                       -- BHOP -> CLIMB_KZT

    -- BHOP_HL1 (3) previously excluded SURF (1), CLIMB_KZT (5)
    (3, 1, 0), (3, 1, 2), (3, 1, 3), (3, 1, 7),               -- BHOP_HL1 -> SURF (all 4 styles)
    (3, 5, 8), (3, 5, 9),                                       -- BHOP_HL1 -> CLIMB_KZT

    -- CLIMB_KZT (5) previously excluded SURF (1), BHOP (2), BHOP_HL1 (3)
    (5, 1, 0), (5, 1, 2), (5, 1, 3), (5, 1, 7),               -- CLIMB_KZT -> SURF (all 4 styles)
    (5, 2, 0), (5, 2, 1), (5, 2, 3), (5, 2, 4), (5, 2, 5),   -- CLIMB_KZT -> BHOP (all 5 styles)
    (5, 3, 0),                                                  -- CLIMB_KZT -> BHOP_HL1

    -- CLIMB_16 (6) previously excluded SURF (1), BHOP (2), BHOP_HL1 (3)
    (6, 1, 0), (6, 1, 2), (6, 1, 3), (6, 1, 7),               -- CLIMB_16 -> SURF (all 4 styles)
    (6, 2, 0), (6, 2, 1), (6, 2, 3), (6, 2, 4), (6, 2, 5),   -- CLIMB_16 -> BHOP (all 5 styles)
    (6, 3, 0)                                                   -- CLIMB_16 -> BHOP_HL1
) AS mapping(source_gamemode, target_gamemode, target_style)
    ON lb."gamemode" = mapping.source_gamemode
WHERE NOT EXISTS (
    SELECT 1
    FROM "Leaderboard" existing
    WHERE existing."mapID"     = lb."mapID"
      AND existing."gamemode"  = mapping.target_gamemode
      AND existing."trackType" = lb."trackType"
      AND existing."trackNum"  = lb."trackNum"
      AND existing."style"     = mapping.target_style
);
