/*
  Warnings:

  - You are about to drop the `MapLibraryEntry` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MapLibraryEntry" DROP CONSTRAINT "MapLibraryEntry_mapID_fkey";

-- DropForeignKey
ALTER TABLE "MapLibraryEntry" DROP CONSTRAINT "MapLibraryEntry_userID_fkey";

-- DropTable
DROP TABLE "MapLibraryEntry";
