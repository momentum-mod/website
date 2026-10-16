-- Returns one row per leaderboard (track) on a map for a given gamemode + style,
-- with that track's total completions and the given user's PB rank (null if they
-- haven't completed it). The PB time is not returned here - the game caches it per
-- track/style from GetMap. Ordered by trackType then trackNum.
-- @param {Int} $1:mapID Map ID
-- @param {Int} $2:gamemode Gamemode
-- @param {Int} $3:style Style number
-- @param {Int} $4:userID User ID to fetch completion status for
SELECT
    lb."trackType",
    lb."trackNum",
    counts."totalCompletions",
    urun."rank"
FROM
    "Leaderboard" lb
    LEFT JOIN LATERAL (
        SELECT
            COUNT(*)::int AS "totalCompletions"
        FROM
            "LeaderboardRun" r
        WHERE (r."mapID", r."gamemode", r."trackType", r."trackNum", r."style")
            = (lb."mapID", lb."gamemode", lb."trackType", lb."trackNum", lb."style")
    ) counts ON TRUE
    LEFT JOIN LATERAL (
        SELECT
            (
                SELECT
                    COUNT(*)::int + 1
                FROM
                    "LeaderboardRun" r2
                WHERE (r2."mapID", r2."gamemode", r2."trackType", r2."trackNum", r2."style")
                    = (lb."mapID", lb."gamemode", lb."trackType", lb."trackNum", lb."style")
                  AND (r2."time", r2."createdAt") < (ur."time", ur."createdAt")
            ) AS "rank"
        FROM
            "LeaderboardRun" ur
        WHERE (ur."mapID", ur."gamemode", ur."trackType", ur."trackNum", ur."style")
            = (lb."mapID", lb."gamemode", lb."trackType", lb."trackNum", lb."style")
          AND ur."userID" = $4
    ) urun ON TRUE
WHERE (lb."mapID", lb."gamemode", lb."style") = ($1, $2, $3)
ORDER BY
    lb."trackType",
    lb."trackNum";
