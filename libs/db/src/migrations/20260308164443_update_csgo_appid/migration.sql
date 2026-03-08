UPDATE "MapInfo"
SET "requiredGames" = array_replace("requiredGames", 730, 4465480)
WHERE 730 = ANY("requiredGames");