/*
  Warnings:

  - You are about to drop the column `hasVmf` on the `MapVersion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MapVersion" ADD COLUMN "bspDownloadId" UUID, ADD COLUMN "vmfDownloadId" UUID;

-- Previously we used version id for downloads, so by default new fields will have the same values.
UPDATE "MapVersion" SET "bspDownloadId" = "id";
UPDATE "MapVersion" SET "vmfDownloadId" = "id" WHERE "hasVmf" = true;

ALTER TABLE "MapVersion" DROP COLUMN "hasVmf";