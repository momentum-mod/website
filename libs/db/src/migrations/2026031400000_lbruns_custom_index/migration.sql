-- Prisma doesn't support INCLUDE, which we need for perf reasons.
-- Prisma feature request: https://github.com/prisma/prisma/issues/8584
DROP INDEX IF EXISTS "LeaderboardRun_mapID_gamemode_trackType_trackNum_style_time_idx";
CREATE INDEX "LeaderboardRun_mapID_gamemode_trackType_trackNum_style_time_idx" ON "LeaderboardRun"("mapID", "gamemode", "trackType", "trackNum", "style", "time" ASC, "createdAt" ASC) INCLUDE ("userID");;
