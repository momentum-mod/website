-- @param {Int} $1:mapID Map ID
-- @param {Int} $2:gamemode Gamemode
-- @param {Int} $3:trackType Track Type
-- @param {Int} $4:trackNum Track Number
-- @param {Int} $5:style Style number
-- @param {Int} $6:userID User ID to get the rank for
SELECT
    (
        SELECT
            COUNT(*)::int + 1
        FROM
            "LeaderboardRun" r2
        WHERE (r2."mapID", r2."gamemode", r2."trackType", r2."trackNum", r2."style") = ($1, $2, $3, $4, $5)
          AND (r2."time", r2."createdAt") < (r."time", r."createdAt")
    ) AS rank
FROM
    "LeaderboardRun" r
WHERE (r."mapID", r."gamemode", r."trackType", r."trackNum", r."style") = ($1, $2, $3, $4, $5)
AND r."userID" = $6
