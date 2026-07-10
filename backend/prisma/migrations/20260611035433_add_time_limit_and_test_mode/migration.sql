-- AlterEnum
ALTER TYPE "ExerciseType" ADD VALUE 'TEST';

-- AlterTable
ALTER TABLE "exercise_sessions" ADD COLUMN     "time_limit_seconds" INTEGER;

-- AlterTable
ALTER TABLE "exercise_settings_presets" ADD COLUMN     "test_types" "ExerciseType"[],
ADD COLUMN     "time_limit_seconds" INTEGER;

-- AlterTable
ALTER TABLE "session_questions" ADD COLUMN     "exercise_type" "ExerciseType";
