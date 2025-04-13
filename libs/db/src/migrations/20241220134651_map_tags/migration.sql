/*
  Warnings:

  - The `tags` column on the `Leaderboard` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Leaderboard" DROP COLUMN "tags",
ADD COLUMN     "tags" SMALLINT[];
