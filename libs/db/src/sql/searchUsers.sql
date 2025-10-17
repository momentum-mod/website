-- @param {String} $1:query Search query
-- @param {Int} $2:skip Pagination skip
-- @param {Int} $3:take Pagination take

SELECT *
FROM "User" u
WHERE u.alias ILIKE '%' || $1 || '%'
ORDER BY
  CASE
    WHEN u.alias ILIKE $1 || '%' THEN 0
    ELSE 1
  END
OFFSET $2
LIMIT $3;
