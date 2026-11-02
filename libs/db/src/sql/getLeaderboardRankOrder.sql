-- @param {Int} $1:mapID Map ID
-- @param {Int} $2:gamemode Gamemode
-- @param {Int} $3:trackType Track Type
-- @param {Int} $4:trackNum Track Number
-- @param {Int} $5:style Style number
-- Runs on every leaderboard during a rebuild, so keep it lean
SELECT
    r."userID",
    CAST(ROW_NUMBER() OVER (ORDER BY r."time", r."createdAt") AS INT) AS "rank"
FROM
    "LeaderboardRun" r
WHERE (r."mapID", r."gamemode", r."trackType", r."trackNum", r."style") = ($1, $2, $3, $4, $5)
ORDER BY
    r."time",
    r."createdAt";
