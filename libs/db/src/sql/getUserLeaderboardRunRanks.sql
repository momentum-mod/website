-- @param $1:mapIDs Array of map IDs, parallel with the other arrays
-- @param $2:gamemodes Array of gamemodes
-- @param $3:trackTypes Array of track types
-- @param $4:trackNums Array of track numbers
-- @param $5:styles Array of styles
-- @param $6:times Array of the runs' times
-- @param $7:createdAts Array of the runs' createdAt, as ISO strings
-- Times and createdAts are passed in rather than looked up, as finding a user's
-- run means reading every run on its leaderboard
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
