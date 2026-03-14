-- @param {Int} $1:mapID Map ID
-- @param {Int} $2:gamemode Gamemode
-- @param {Int} $3:trackType Track Type
-- @param {Int} $4:trackNum Track Number
-- @param {Int} $5:style Style number

-- Minimum data we need for ranking systems.
-- So far on production these have all fit inside of V8 SMIs so allocs are quite
-- low, and should stay that way until we get 2^31 users (god forbid).
SELECT run."userID",
       run."mapID",
       run."gamemode",
       run."trackType",
       run."trackNum",
       run."style",
       CAST(
           ROW_NUMBER() OVER (
           PARTITION BY
             run."mapID",
             run."gamemode",
             run."trackType",
             run."trackNum",
             run."style"
           ORDER BY
             "time",
             "createdAt"
           ) AS INT
       ) AS "rank"
FROM "LeaderboardRun" AS run
WHERE run."mapID" = $1
  AND run."gamemode" = $2
  AND run."trackType" = $3
  AND run."trackNum" = $4
  AND run."style" = $5;
