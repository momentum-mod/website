/*
  Warnings:

  - You are about to drop the `RunSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RunSessionTimestamp` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RunSession" DROP CONSTRAINT "RunSession_mapID_fkey";

-- DropForeignKey
ALTER TABLE "RunSession" DROP CONSTRAINT "RunSession_userID_fkey";

-- DropForeignKey
ALTER TABLE "RunSessionTimestamp" DROP CONSTRAINT "RunSessionTimestamp_sessionID_fkey";

-- DropTable
DROP TABLE "RunSession";

-- DropTable
DROP TABLE "RunSessionTimestamp";
