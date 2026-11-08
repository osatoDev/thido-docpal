-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "dailyPlanEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "timeZone" TEXT,
ADD COLUMN     "dailyPlanEmailSentDay" TEXT;
