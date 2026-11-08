-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "dailyPlanEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "timeZone" TEXT,
ADD COLUMN     "dailyPlanEmailSentDay" TEXT;
