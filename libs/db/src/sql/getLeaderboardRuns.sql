-- @param {Int} $1:mapID Map ID
-- @param {Int} $2:gamemode Gamemode
-- @param {Int} $3:trackType Track Type
-- @param {Int} $4:trackNum Track Number
-- @param {Int} $5:style Style number
-- @param {Int} $6:offset Pagination offset
-- @param {Int} $7:limit Pagination limit

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
       u."id"                                 AS "user_id",
       u."steamID"                            AS "user_steamID",
       u."alias"                              AS "user_alias",
       u."avatar"                             AS "user_avatar",
       u."country"                            AS "user_country",
       u."roles"                              AS "user_roles",
       u."bans"                               AS "user_bans",
       u."createdAt"                          AS "user_createdAt",
       CAST(ROW_NUMBER() OVER () + $6 AS INT) AS "rank"
FROM (SELECT *
      FROM "LeaderboardRun"
      WHERE ("mapID", "gamemode", "trackType", "trackNum", "style") =
            ($1, $2, $3, $4, $5)
        AND ("time", "createdAt") >= (SELECT "time",
                                             "createdAt"
                                      FROM "LeaderboardRun"
                                      WHERE ("mapID", "gamemode", "trackType",
                                             "trackNum", "style") =
                                            ($1, $2, $3, $4, $5)
                                      ORDER BY "time",
                                               "createdAt"
                                      OFFSET $6 LIMIT 1)
      ORDER BY "time",
               "createdAt"
      LIMIT $7) r
       INNER JOIN "User" AS "u" ON "userID" = "u"."id";



