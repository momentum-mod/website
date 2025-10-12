UPDATE "MapSubmission" submission
SET "placeholders" = '[]'::jsonb
FROM "MMap" map
WHERE submission."mapID" = map."id"
AND map."status" = 0;