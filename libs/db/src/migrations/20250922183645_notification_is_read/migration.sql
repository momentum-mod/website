-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "isRead" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "MapSubmissionDate_submissionMapID_idx" ON "MapSubmissionDate"("submissionMapID");
