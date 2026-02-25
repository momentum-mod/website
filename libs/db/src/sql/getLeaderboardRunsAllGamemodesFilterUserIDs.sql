-- @param {Int} $1:mapID Map ID
-- @param {Int} $2:trackType Track Type
-- @param {Int} $3:trackNum Track Number
-- @param {Int} $4:style Style number
-- @param       $5:userIDs Array of user IDs to filter by
-- @param {Int} $6:offset Pagination offset
-- @param {Int} $7:limit Pagination limit

WITH ranked AS (SELECT "userID",
                       "mapID",
                       "gamemode",
                       "trackType",
                       "trackNum",
                       "style",
                       "time",
                       "replayHash",
                       "flags",
                       "pastRunID",
                       "createdAt",
                       CAST(ROW_NUMBER()
                            OVER (PARTITION BY "gamemode" ORDER BY "time", "createdAt") AS INT) "rank"
                FROM "LeaderboardRun"
                WHERE ("mapID",
                       "trackType",
                       "trackNum",
                       "style") = ($1, $2, $3, $4))
SELECT "ranked".*,
       u."id"        AS "user_id",
       u."steamID"   AS "user_steamID",
       u."alias"     AS "user_alias",
       u."avatar"    AS "user_avatar",
       u."country"   AS "user_country",
       u."roles"     AS "user_roles",
       u."bans"      AS "user_bans",
       u."createdAt" AS "user_createdAt"
FROM ranked
       INNER JOIN "User" AS "u"
                  ON "ranked"."userID" = "u"."id"
WHERE "ranked"."userID" = ANY ($5)
ORDER BY "ranked"."gamemode",
         "ranked"."time",
         "ranked"."createdAt"
OFFSET $6 LIMIT $7;
