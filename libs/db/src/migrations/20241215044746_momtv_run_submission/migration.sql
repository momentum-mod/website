/*
  Warnings:

  - You are about to drop the column `stats` on the `LeaderboardRun` table. All the data in the column will be lost.
  - You are about to drop the column `checkpoint` on the `RunSessionTimestamp` table. All the data in the column will be lost.
  - You are about to drop the column `segment` on the `RunSessionTimestamp` table. All the data in the column will be lost.
  - Added the required column `splits` to the `LeaderboardRun` table without a default value. This is not possible if the table is not empty.
  - Added the required column `majorNum` to the `RunSessionTimestamp` table without a default value. This is not possible if the table is not empty.
  - Added the required column `minorNum` to the `RunSessionTimestamp` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LeaderboardRun" DROP COLUMN "stats",
ADD COLUMN     "splits" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "RunSessionTimestamp" DROP COLUMN "checkpoint",
DROP COLUMN "segment",
ADD COLUMN     "majorNum" SMALLINT NOT NULL,
ADD COLUMN     "minorNum" SMALLINT NOT NULL;
