-- AlterTable
ALTER TABLE "MapReview" ADD COLUMN     "approves" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MapReviewStats" (
    "mapID" INTEGER NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "approvals" INTEGER NOT NULL DEFAULT 0,
    "resolved" INTEGER NOT NULL DEFAULT 0,
    "unresolved" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MapReviewStats_pkey" PRIMARY KEY ("mapID")
);

-- AddForeignKey
ALTER TABLE "MapReviewStats" ADD CONSTRAINT "MapReviewStats_mapID_fkey" FOREIGN KEY ("mapID") REFERENCES "MMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;
