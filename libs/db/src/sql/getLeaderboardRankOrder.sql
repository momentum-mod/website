-- @param {Int} $1:mapID Map ID
-- @param {Int} $2:gamemode Gamemode
-- @param {Int} $3:trackType Track Type
-- @param {Int} $4:trackNum Track Number
-- @param {Int} $5:style Style number

-- The minimum data needed to compute rank points for an entire leaderboard:
-- every user on it, and their rank. Ties on time are broken by submission
-- date so ranks are unique.
--
-- This is an index-only scan over the (mapID, gamemode, trackType, trackNum,
-- style, time, createdAt) index plus a lookup for userID, and will be run for
-- every leaderboard when rank points are rebuilt, so keep it lean.
SELECT
    r."userID",
    CAST(ROW_NUMBER() OVER (ORDER BY r."time", r."createdAt") AS INT) AS "rank"
FROM
    "LeaderboardRun" r
WHERE (r."mapID", r."gamemode", r."trackType", r."trackNum", r."style") = ($1, $2, $3, $4, $5)
ORDER BY
    r."time",
    r."createdAt";
