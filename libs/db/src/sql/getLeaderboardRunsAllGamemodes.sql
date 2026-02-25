-- @param {Int} $1:mapID Map ID
-- @param {Int} $2:trackType Track Type
-- @param {Int} $3:trackNum Track Number
-- @param {Int} $4:style Style number
-- @param {Int} $5:offset Pagination offset
-- @param {Int} $6:limit Pagination limit

SELECT r."userID",
       r."mapID",
       r."gamemode",
       r."trackType",
       r."trackNum",
       r."style",
       r."time",
       r."replayHash",
       r."flags",
       r."pastRunID",
       r."createdAt",
       u."id"                                                   AS "user_id",
       u."steamID"                                              AS "user_steamID",
       u."alias"                                                AS "user_alias",
       u."avatar"                                               AS "user_avatar",
       u."country"                                              AS "user_country",
       u."roles"                                                AS "user_roles",
       u."bans"                                                 AS "user_bans",
       u."createdAt"                                            AS "user_createdAt",
       CAST(ROW_NUMBER() OVER (PARTITION BY "gamemode") AS INT) AS "rank"
FROM (SELECT *
      FROM "LeaderboardRun"
      WHERE ("mapID", "trackType", "trackNum", "style") =
            ($1, $2, $3, $4)
        AND ("time", "createdAt") >= (SELECT "time",
                                             "createdAt"
                                      FROM "LeaderboardRun"
                                      WHERE ("mapID", "trackType",
                                             "trackNum", "style") =
                                            ($1, $2, $3, $4)
                                      ORDER BY "time",
                                               "createdAt"
                                      OFFSET $5 LIMIT 1)
      ORDER BY "gamemode",
               "time",
               "createdAt"
      LIMIT $6) r
       INNER JOIN "User" AS "u" ON "userID" = "u"."id";



