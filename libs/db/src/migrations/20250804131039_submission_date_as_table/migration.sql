/*
  Warnings:

  - You are about to drop the column `dates` on the `MapSubmission` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MapSubmission" DROP COLUMN "dates";

-- CreateTable
CREATE TABLE "MapSubmissionDate" (
    "id" SERIAL NOT NULL,
    "status" SMALLINT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userID" INTEGER,
    "submissionMapID" INTEGER NOT NULL,

    CONSTRAINT "MapSubmissionDate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MapSubmissionDate" ADD CONSTRAINT "MapSubmissionDate_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapSubmissionDate" ADD CONSTRAINT "MapSubmissionDate_submissionMapID_fkey" FOREIGN KEY ("submissionMapID") REFERENCES "MapSubmission"("mapID") ON DELETE CASCADE ON UPDATE CASCADE;
