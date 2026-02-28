-- @param {Int} $1:mapID Map ID
-- @param {Int} $2:gamemode Gamemode
-- @param {Int} $3:trackType Track Type
-- @param {Int} $4:trackNum Track Number
-- @param {Int} $5:style Style number
-- @param {Int} $6:offset Pagination offset
-- @param {Int} $7:limit Pagination limit


SELECT "s".*, row_to_json("u") as "user",
  ROW_NUMBER() OVER () + $6 AS rn
FROM (
  SELECT *
  FROM "LeaderboardRun"
  WHERE ("mapID", "gamemode", "trackType", "trackNum", "style") = ($1, $2, $3, $4, $5)
    AND ("time", "createdAt") >= (
      SELECT "time", "createdAt"
      FROM "LeaderboardRun"
      WHERE ("mapID", "gamemode", "trackType", "trackNum", "style") = ($1, $2, $3, $4, $5)
      ORDER BY "time" ASC, "createdAt" ASC
      OFFSET $6 LIMIT 1
    )
  ORDER BY "time" ASC, "createdAt" ASC
  LIMIT $7
) s
INNER JOIN "User" AS "u" ON "userID"="u"."id";
