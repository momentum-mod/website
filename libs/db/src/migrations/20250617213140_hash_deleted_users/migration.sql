/*
  Warnings:

  - You are about to drop the `DeletedSteamID` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "DeletedSteamID";

-- CreateTable
CREATE TABLE "DeletedUser" (
    "steamIDHash" CHAR(64) NOT NULL,

    CONSTRAINT "DeletedUser_pkey" PRIMARY KEY ("steamIDHash")
);
