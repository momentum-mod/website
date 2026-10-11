-- @param $1:mapIDs Array of map IDs, parallel with the other arrays
-- @param $2:gamemodes Array of gamemodes
-- @param $3:trackTypes Array of track types
-- @param $4:trackNums Array of track numbers
-- @param $5:styles Array of styles
-- @param $6:times Array of the runs' times
-- @param $7:createdAts Array of the runs' createdAt, as ISO strings

-- For a set of runs (given as parallel arrays of their leaderboard, time and
-- createdAt), returns each run's rank on its leaderboard and the total number
-- of runs on it. Used to decorate a page of a user's runs without a query per
-- run.
--
-- The caller already has each run's time and createdAt, so they're passed in
-- rather than looked up: the planner reaches a user's run through the
-- leaderboard-order index and filters on userID, reading every run on the
-- leaderboard. Both counts are index-only scans of that index.
WITH runs AS (
    SELECT
        *
    FROM
        unnest($1::int[], $2::smallint[], $3::smallint[], $4::smallint[], $5::smallint[], $6::float8[], $7::text[])
        AS t ("mapID", "gamemode", "trackType", "trackNum", "style", "time", "createdAt")
)
SELECT
    runs."mapID",
    runs."gamemode",
    runs."trackType",
    runs."trackNum",
    runs."style",
    CAST((
        SELECT
            COUNT(*)
        FROM "LeaderboardRun" faster
        WHERE (faster."mapID", faster."gamemode", faster."trackType", faster."trackNum", faster."style")
            = (runs."mapID", runs."gamemode", runs."trackType", runs."trackNum", runs."style")
        AND (faster."time", faster."createdAt") < (runs."time", runs."createdAt"::timestamp(3))) + 1 AS INT) AS "rank",
    CAST((
        SELECT
            COUNT(*)
        FROM "LeaderboardRun" total
        WHERE (total."mapID", total."gamemode", total."trackType", total."trackNum", total."style")
            = (runs."mapID", runs."gamemode", runs."trackType", runs."trackNum", runs."style")) AS INT) AS "totalRuns"
FROM
    runs;
