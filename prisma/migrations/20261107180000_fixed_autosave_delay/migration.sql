-- Autosave now always runs 3 seconds after the last edit, so the per-user
-- delay setting is removed.

-- AlterTable
ALTER TABLE "UserSettings" DROP COLUMN "autosaveDelaySeconds";

