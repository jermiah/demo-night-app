-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "startupCId" TEXT;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_startupCId_fkey" FOREIGN KEY ("startupCId") REFERENCES "Demo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
