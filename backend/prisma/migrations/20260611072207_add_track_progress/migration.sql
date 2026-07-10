-- AlterTable
ALTER TABLE "exercise_sessions" ADD COLUMN     "track_progress" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "exercise_settings_presets" ADD COLUMN     "track_progress" BOOLEAN NOT NULL DEFAULT true;
