-- @param {Int} $1:userID User ID
-- @param       $2:mapIDs Array of map IDs, parallel with the other arrays
-- @param       $3:gamemodes Array of gamemodes
-- @param       $4:trackTypes Array of track types
-- @param       $5:trackNums Array of track numbers
-- @param       $6:styles Array of styles

-- For a user and a set of leaderboards (given as parallel arrays), returns the
-- user's rank on each leaderboard and the total number of runs on it. Used to
-- decorate a page of a user's runs without a query per run. Leaderboards the
-- user has no run on are omitted.
--
-- Both subqueries are index-only scans of the leaderboard-order index.
WITH lbs AS (
    SELECT
        *
    FROM
        unnest($2::int[], $3::smallint[], $4::smallint[], $5::smallint[], $6::smallint[])
        AS t ("mapID", "gamemode", "trackType", "trackNum", "style")
)
SELECT
    lbs."mapID",
    lbs."gamemode",
    lbs."trackType",
    lbs."trackNum",
    lbs."style",
    CAST((
        SELECT
            COUNT(*)
        FROM "LeaderboardRun" faster
        WHERE (faster."mapID", faster."gamemode", faster."trackType", faster."trackNum", faster."style")
            = (lbs."mapID", lbs."gamemode", lbs."trackType", lbs."trackNum", lbs."style")
        AND (faster."time", faster."createdAt") < (r."time", r."createdAt")) + 1 AS INT) AS "rank",
    CAST((
        SELECT
            COUNT(*)
        FROM "LeaderboardRun" total
        WHERE (total."mapID", total."gamemode", total."trackType", total."trackNum", total."style")
            = (lbs."mapID", lbs."gamemode", lbs."trackType", lbs."trackNum", lbs."style")) AS INT) AS "totalRuns"
FROM
    lbs
    INNER JOIN "LeaderboardRun" r
        ON (r."mapID", r."gamemode", r."trackType", r."trackNum", r."style")
            = (lbs."mapID", lbs."gamemode", lbs."trackType", lbs."trackNum", lbs."style")
        AND r."userID" = $1;
