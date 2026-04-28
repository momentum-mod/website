-- @param {Int} $1:mapID Map ID
-- @param {Int} $2:gamemode Gamemode
-- @param {Int} $3:trackType Track Type
-- @param {Int} $4:trackNum Track Number
-- @param {Int} $5:style Style number
-- @param {Int} $6:userID User ID
SELECT
    r."userID",
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
    u."id" AS "user_id",
    u."steamID" AS "user_steamID",
    u."alias" AS "user_alias",
    u."avatar" AS "user_avatar",
    u."country" AS "user_country",
    u."roles" AS "user_roles",
    u."bans" AS "user_bans",
    u."createdAt" AS "user_createdAt",
    CAST((
        SELECT
            COUNT(*)
        FROM "LeaderboardRun" sub
        WHERE (sub."mapID", sub."gamemode", sub."trackType", sub."trackNum", sub."style") = ($1, $2, $3, $4, $5)
        AND (sub."time", sub."createdAt") < (r."time", r."createdAt")) + 1 AS INT) AS "rank"
FROM
    "LeaderboardRun" r
    INNER JOIN "User" u ON r."userID" = u."id"
WHERE (r."mapID", r."gamemode", r."trackType", r."trackNum", r."style") = ($1, $2, $3, $4, $5)
AND r."userID" = $6;

