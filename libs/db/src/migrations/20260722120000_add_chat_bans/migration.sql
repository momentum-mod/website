-- CreateTable
CREATE TABLE "ChatBan" (
    "id" SERIAL NOT NULL,
    "type" SMALLINT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "reason" TEXT,
    "targetID" INTEGER NOT NULL,
    "issuerID" INTEGER,
    "reportID" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatBan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatBan_targetID_type_idx" ON "ChatBan"("targetID", "type");

-- AddForeignKey
ALTER TABLE "ChatBan" ADD CONSTRAINT "ChatBan_targetID_fkey" FOREIGN KEY ("targetID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatBan" ADD CONSTRAINT "ChatBan_issuerID_fkey" FOREIGN KEY ("issuerID") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatBan" ADD CONSTRAINT "ChatBan_reportID_fkey" FOREIGN KEY ("reportID") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;
