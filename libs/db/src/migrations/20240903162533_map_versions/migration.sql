/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `Follow` table. All the data in the column will be lost.
  - You are about to drop the column `hasVmf` on the `MMap` table. All the data in the column will be lost.
  - You are about to drop the column `hash` on the `MMap` table. All the data in the column will be lost.
  - You are about to drop the column `zones` on the `MMap` table. All the data in the column will be lost.
  - You are about to drop the column `currentVersionID` on the `MapSubmission` table. All the data in the column will be lost.
  - You are about to drop the `MapSubmissionVersion` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[currentVersionID]` on the table `MMap` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "MapSubmission" DROP CONSTRAINT "MapSubmission_currentVersionID_fkey";

-- DropForeignKey
ALTER TABLE "MapSubmissionVersion" DROP CONSTRAINT "MapSubmissionVersion_submissionID_fkey";

-- DropIndex
DROP INDEX "MapSubmission_currentVersionID_key";

-- AlterTable
ALTER TABLE "Follow" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "MMap" DROP COLUMN "hasVmf",
DROP COLUMN "hash",
DROP COLUMN "zones",
ADD COLUMN     "currentVersionID" UUID;

-- AlterTable
ALTER TABLE "MapSubmission" DROP COLUMN "currentVersionID";

-- DropTable
DROP TABLE "MapSubmissionVersion";

-- CreateTable
CREATE TABLE "MapVersion" (
    "id" UUID NOT NULL,
    "versionNum" SMALLINT NOT NULL,
    "changelog" TEXT,
    "bspHash" CHAR(40),
    "zoneHash" CHAR(40),
    "hasVmf" BOOLEAN NOT NULL DEFAULT false,
    "zones" JSONB,
    "submitterID" INTEGER,
    "mapID" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MapVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MapVersion_mapID_idx" ON "MapVersion"("mapID");

-- CreateIndex
CREATE UNIQUE INDEX "MMap_currentVersionID_key" ON "MMap"("currentVersionID");

-- AddForeignKey
ALTER TABLE "MMap" ADD CONSTRAINT "MMap_currentVersionID_fkey" FOREIGN KEY ("currentVersionID") REFERENCES "MapVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapVersion" ADD CONSTRAINT "MapVersion_submitterID_fkey" FOREIGN KEY ("submitterID") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapVersion" ADD CONSTRAINT "MapVersion_mapID_fkey" FOREIGN KEY ("mapID") REFERENCES "MMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;
