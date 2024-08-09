-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "roles" SMALLINT NOT NULL DEFAULT 0,
    "bans" SMALLINT NOT NULL DEFAULT 0,
    "steamID" BIGINT,
    "alias" TEXT NOT NULL,
    "avatar" TEXT,
    "country" CHAR(2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "bio" TEXT NOT NULL DEFAULT '',
    "socials" JSONB,
    "userID" INTEGER NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("userID")
);

-- CreateTable
CREATE TABLE "UserAuth" (
    "refreshToken" TEXT,
    "userID" INTEGER NOT NULL,

    CONSTRAINT "UserAuth_pkey" PRIMARY KEY ("userID")
);

-- CreateTable
CREATE TABLE "UserStats" (
    "totalJumps" BIGINT NOT NULL DEFAULT 0,
    "totalStrafes" BIGINT NOT NULL DEFAULT 0,
    "level" SMALLINT NOT NULL DEFAULT 1,
    "cosXP" BIGINT NOT NULL DEFAULT 0,
    "mapsCompleted" INTEGER NOT NULL DEFAULT 0,
    "runsSubmitted" INTEGER NOT NULL DEFAULT 0,
    "userID" INTEGER NOT NULL,

    CONSTRAINT "UserStats_pkey" PRIMARY KEY ("userID")
);

-- CreateTable
CREATE TABLE "DeletedSteamID" (
    "steamID" BIGINT NOT NULL,

    CONSTRAINT "DeletedSteamID_pkey" PRIMARY KEY ("steamID")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" SERIAL NOT NULL,
    "type" SMALLINT NOT NULL,
    "data" BIGINT NOT NULL,
    "category" SMALLINT NOT NULL,
    "message" TEXT,
    "resolved" BOOLEAN DEFAULT false,
    "resolutionMessage" TEXT,
    "submitterID" INTEGER,
    "resolverID" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" SERIAL NOT NULL,
    "type" SMALLINT NOT NULL DEFAULT 0,
    "data" BIGINT NOT NULL,
    "userID" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "notifyOn" SMALLINT NOT NULL DEFAULT 0,
    "followedID" INTEGER NOT NULL,
    "followeeID" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("followeeID","followedID")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "userID" INTEGER NOT NULL,
    "activityID" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapNotify" (
    "notifyOn" SMALLINT NOT NULL,
    "mapID" INTEGER NOT NULL,
    "userID" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapNotify_pkey" PRIMARY KEY ("userID","mapID")
);

-- CreateTable
CREATE TABLE "MMap" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" SMALLINT NOT NULL,
    "hash" CHAR(40),
    "hasVmf" BOOLEAN NOT NULL DEFAULT false,
    "zones" JSONB,
    "images" TEXT[],
    "submitterID" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapCredit" (
    "type" SMALLINT NOT NULL,
    "description" TEXT,
    "mapID" INTEGER NOT NULL,
    "userID" INTEGER NOT NULL,

    CONSTRAINT "MapCredit_pkey" PRIMARY KEY ("mapID","userID")
);

-- CreateTable
CREATE TABLE "MapFavorite" (
    "id" SERIAL NOT NULL,
    "mapID" INTEGER NOT NULL,
    "userID" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MapFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapInfo" (
    "description" TEXT NOT NULL DEFAULT '',
    "youtubeID" TEXT,
    "creationDate" TIMESTAMP(3) NOT NULL,
    "mapID" INTEGER NOT NULL,

    CONSTRAINT "MapInfo_pkey" PRIMARY KEY ("mapID")
);

-- CreateTable
CREATE TABLE "MapLibraryEntry" (
    "id" SERIAL NOT NULL,
    "userID" INTEGER NOT NULL,
    "mapID" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapLibraryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapStats" (
    "reviews" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "subscriptions" INTEGER NOT NULL DEFAULT 0,
    "plays" INTEGER NOT NULL DEFAULT 0,
    "favorites" INTEGER NOT NULL DEFAULT 0,
    "completions" INTEGER NOT NULL DEFAULT 0,
    "uniqueCompletions" INTEGER NOT NULL DEFAULT 0,
    "timePlayed" BIGINT NOT NULL DEFAULT 0,
    "mapID" INTEGER NOT NULL,

    CONSTRAINT "MapStats_pkey" PRIMARY KEY ("mapID")
);

-- CreateTable
CREATE TABLE "MapTestInvite" (
    "mapID" INTEGER NOT NULL,
    "userID" INTEGER NOT NULL,
    "state" SMALLINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapTestInvite_pkey" PRIMARY KEY ("mapID","userID")
);

-- CreateTable
CREATE TABLE "MapSubmission" (
    "mapID" INTEGER NOT NULL,
    "type" SMALLINT NOT NULL,
    "suggestions" JSONB NOT NULL DEFAULT '[]',
    "placeholders" JSONB,
    "dates" JSONB NOT NULL DEFAULT '[]',
    "currentVersionID" UUID,

    CONSTRAINT "MapSubmission_pkey" PRIMARY KEY ("mapID")
);

-- CreateTable
CREATE TABLE "MapSubmissionVersion" (
    "id" UUID NOT NULL,
    "versionNum" SMALLINT NOT NULL,
    "changelog" TEXT,
    "hash" CHAR(40),
    "hasVmf" BOOLEAN NOT NULL DEFAULT false,
    "zones" JSONB,
    "submissionID" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MapSubmissionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapReview" (
    "id" SERIAL NOT NULL,
    "mainText" TEXT NOT NULL,
    "suggestions" JSONB NOT NULL DEFAULT '[]',
    "editHistory" JSONB NOT NULL DEFAULT '[]',
    "imageIDs" TEXT[],
    "mapID" INTEGER NOT NULL,
    "reviewerID" INTEGER NOT NULL,
    "resolved" BOOLEAN,
    "resolverID" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapReviewComment" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "userID" INTEGER NOT NULL,
    "reviewID" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapReviewComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leaderboard" (
    "mapID" INTEGER NOT NULL,
    "gamemode" SMALLINT NOT NULL,
    "trackType" SMALLINT NOT NULL,
    "trackNum" SMALLINT NOT NULL,
    "style" SMALLINT NOT NULL,
    "tier" SMALLINT,
    "linear" BOOLEAN,
    "type" SMALLINT NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "Leaderboard_pkey" PRIMARY KEY ("mapID","gamemode","trackType","trackNum","style")
);

-- CreateTable
CREATE TABLE "LeaderboardRun" (
    "userID" INTEGER NOT NULL,
    "mapID" INTEGER NOT NULL,
    "gamemode" SMALLINT NOT NULL,
    "trackType" SMALLINT NOT NULL,
    "trackNum" SMALLINT NOT NULL,
    "style" SMALLINT NOT NULL,
    "time" REAL NOT NULL,
    "stats" JSONB NOT NULL,
    "replayHash" CHAR(40),
    "flags" SMALLINT[],
    "rank" INTEGER NOT NULL,
    "rankXP" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pastRunID" BIGINT,

    CONSTRAINT "LeaderboardRun_pkey" PRIMARY KEY ("userID","gamemode","style","mapID","trackType","trackNum")
);

-- CreateTable
CREATE TABLE "PastRun" (
    "id" BIGSERIAL NOT NULL,
    "userID" INTEGER NOT NULL,
    "mapID" INTEGER NOT NULL,
    "gamemode" SMALLINT NOT NULL,
    "trackType" SMALLINT NOT NULL,
    "trackNum" SMALLINT NOT NULL,
    "style" SMALLINT NOT NULL,
    "time" REAL NOT NULL,
    "flags" SMALLINT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PastRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunSession" (
    "id" BIGSERIAL NOT NULL,
    "trackType" SMALLINT NOT NULL,
    "trackNum" SMALLINT NOT NULL,
    "gamemode" SMALLINT NOT NULL,
    "userID" INTEGER NOT NULL,
    "mapID" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunSessionTimestamp" (
    "id" BIGSERIAL NOT NULL,
    "segment" SMALLINT NOT NULL,
    "checkpoint" SMALLINT NOT NULL,
    "time" DOUBLE PRECISION NOT NULL,
    "sessionID" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunSessionTimestamp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminActivity" (
    "id" SERIAL NOT NULL,
    "comment" TEXT,
    "type" INTEGER NOT NULL,
    "target" BIGINT NOT NULL,
    "oldData" JSONB NOT NULL,
    "newData" JSONB NOT NULL,
    "userID" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Config" (
    "id" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_steamID" ON "User"("steamID");

-- CreateIndex
CREATE INDEX "Report_resolverID_submitterID_idx" ON "Report"("resolverID", "submitterID");

-- CreateIndex
CREATE INDEX "Activity_userID_idx" ON "Activity"("userID");

-- CreateIndex
CREATE INDEX "Notification_activityID_userID_idx" ON "Notification"("activityID", "userID");

-- CreateIndex
CREATE UNIQUE INDEX "MMap_name_key" ON "MMap"("name");

-- CreateIndex
CREATE INDEX "MMap_submitterID_idx" ON "MMap"("submitterID");

-- CreateIndex
CREATE INDEX "MMap_status_createdAt_idx" ON "MMap"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "MapCredit_mapID_idx" ON "MapCredit"("mapID");

-- CreateIndex
CREATE UNIQUE INDEX "MapFavorite_mapID_userID_key" ON "MapFavorite"("mapID", "userID");

-- CreateIndex
CREATE UNIQUE INDEX "MapInfo_mapID_key" ON "MapInfo"("mapID");

-- CreateIndex
CREATE UNIQUE INDEX "MapLibraryEntry_mapID_userID_key" ON "MapLibraryEntry"("mapID", "userID");

-- CreateIndex
CREATE UNIQUE INDEX "MapSubmission_currentVersionID_key" ON "MapSubmission"("currentVersionID");

-- CreateIndex
CREATE INDEX "MapSubmissionVersion_submissionID_idx" ON "MapSubmissionVersion"("submissionID");

-- CreateIndex
CREATE INDEX "MapReview_mapID_idx" ON "MapReview"("mapID");

-- CreateIndex
CREATE INDEX "MapReviewComment_reviewID_createdAt_idx" ON "MapReviewComment"("reviewID", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardRun_pastRunID_key" ON "LeaderboardRun"("pastRunID");

-- CreateIndex
CREATE INDEX "LeaderboardRun_mapID_gamemode_trackType_trackNum_style_time_idx" ON "LeaderboardRun"("mapID", "gamemode", "trackType", "trackNum", "style", "time" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "PastRun_userID_idx" ON "PastRun"("userID");

-- CreateIndex
CREATE INDEX "RunSession_userID_idx" ON "RunSession"("userID");

-- CreateIndex
CREATE INDEX "RunSessionTimestamp_sessionID_idx" ON "RunSessionTimestamp"("sessionID");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAuth" ADD CONSTRAINT "UserAuth_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStats" ADD CONSTRAINT "UserStats_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_submitterID_fkey" FOREIGN KEY ("submitterID") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_resolverID_fkey" FOREIGN KEY ("resolverID") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followedID_fkey" FOREIGN KEY ("followedID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followeeID_fkey" FOREIGN KEY ("followeeID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_activityID_fkey" FOREIGN KEY ("activityID") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapNotify" ADD CONSTRAINT "MapNotify_mapID_fkey" FOREIGN KEY ("mapID") REFERENCES "MMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapNotify" ADD CONSTRAINT "MapNotify_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MMap" ADD CONSTRAINT "MMap_submitterID_fkey" FOREIGN KEY ("submitterID") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapCredit" ADD CONSTRAINT "MapCredit_mapID_fkey" FOREIGN KEY ("mapID") REFERENCES "MMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapCredit" ADD CONSTRAINT "MapCredit_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapFavorite" ADD CONSTRAINT "MapFavorite_mapID_fkey" FOREIGN KEY ("mapID") REFERENCES "MMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapFavorite" ADD CONSTRAINT "MapFavorite_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapInfo" ADD CONSTRAINT "MapInfo_mapID_fkey" FOREIGN KEY ("mapID") REFERENCES "MMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapLibraryEntry" ADD CONSTRAINT "MapLibraryEntry_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapLibraryEntry" ADD CONSTRAINT "MapLibraryEntry_mapID_fkey" FOREIGN KEY ("mapID") REFERENCES "MMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapStats" ADD CONSTRAINT "MapStats_mapID_fkey" FOREIGN KEY ("mapID") REFERENCES "MMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapTestInvite" ADD CONSTRAINT "MapTestInvite_mapID_fkey" FOREIGN KEY ("mapID") REFERENCES "MMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapTestInvite" ADD CONSTRAINT "MapTestInvite_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapSubmission" ADD CONSTRAINT "MapSubmission_mapID_fkey" FOREIGN KEY ("mapID") REFERENCES "MMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapSubmission" ADD CONSTRAINT "MapSubmission_currentVersionID_fkey" FOREIGN KEY ("currentVersionID") REFERENCES "MapSubmissionVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapSubmissionVersion" ADD CONSTRAINT "MapSubmissionVersion_submissionID_fkey" FOREIGN KEY ("submissionID") REFERENCES "MapSubmission"("mapID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapReview" ADD CONSTRAINT "MapReview_mapID_fkey" FOREIGN KEY ("mapID") REFERENCES "MMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapReview" ADD CONSTRAINT "MapReview_reviewerID_fkey" FOREIGN KEY ("reviewerID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapReview" ADD CONSTRAINT "MapReview_resolverID_fkey" FOREIGN KEY ("resolverID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapReviewComment" ADD CONSTRAINT "MapReviewComment_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapReviewComment" ADD CONSTRAINT "MapReviewComment_reviewID_fkey" FOREIGN KEY ("reviewID") REFERENCES "MapReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leaderboard" ADD CONSTRAINT "Leaderboard_mapID_fkey" FOREIGN KEY ("mapID") REFERENCES "MMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardRun" ADD CONSTRAINT "LeaderboardRun_mapID_gamemode_trackType_trackNum_style_fkey" FOREIGN KEY ("mapID", "gamemode", "trackType", "trackNum", "style") REFERENCES "Leaderboard"("mapID", "gamemode", "trackType", "trackNum", "style") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardRun" ADD CONSTRAINT "LeaderboardRun_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardRun" ADD CONSTRAINT "LeaderboardRun_mapID_fkey" FOREIGN KEY ("mapID") REFERENCES "MMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardRun" ADD CONSTRAINT "LeaderboardRun_pastRunID_fkey" FOREIGN KEY ("pastRunID") REFERENCES "PastRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastRun" ADD CONSTRAINT "PastRun_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastRun" ADD CONSTRAINT "PastRun_mapID_fkey" FOREIGN KEY ("mapID") REFERENCES "MMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunSession" ADD CONSTRAINT "RunSession_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunSession" ADD CONSTRAINT "RunSession_mapID_fkey" FOREIGN KEY ("mapID") REFERENCES "MMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunSessionTimestamp" ADD CONSTRAINT "RunSessionTimestamp_sessionID_fkey" FOREIGN KEY ("sessionID") REFERENCES "RunSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminActivity" ADD CONSTRAINT "AdminActivity_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
