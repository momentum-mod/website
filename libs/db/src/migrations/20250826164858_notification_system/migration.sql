/*
  Warnings:

  - You are about to drop the column `activityID` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `read` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Notification` table. All the data in the column will be lost.
  - Added the required column `notifiedUserID` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_activityID_fkey";

-- DropIndex
DROP INDEX "Notification_activityID_userID_idx";

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "activityID",
DROP COLUMN "read",
DROP COLUMN "updatedAt",
ADD COLUMN     "json" JSONB DEFAULT '{}',
ADD COLUMN     "mapID" INTEGER,
ADD COLUMN     "notifiedUserID" INTEGER NOT NULL,
ADD COLUMN     "reviewCommentID" INTEGER,
ADD COLUMN     "reviewID" INTEGER,
ADD COLUMN     "type" INTEGER NOT NULL,
ALTER COLUMN "userID" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Notification_notifiedUserID_idx" ON "Notification"("notifiedUserID");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_notifiedUserID_fkey" FOREIGN KEY ("notifiedUserID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_mapID_fkey" FOREIGN KEY ("mapID") REFERENCES "MMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_reviewID_fkey" FOREIGN KEY ("reviewID") REFERENCES "MapReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_reviewCommentID_fkey" FOREIGN KEY ("reviewCommentID") REFERENCES "MapReviewComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
