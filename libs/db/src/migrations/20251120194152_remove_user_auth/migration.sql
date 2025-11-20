/*
  Warnings:

  - You are about to drop the `UserAuth` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."UserAuth" DROP CONSTRAINT "UserAuth_userID_fkey";

-- DropTable
DROP TABLE "public"."UserAuth";
