-- AlterEnum
ALTER TYPE "ContentFormat" ADD VALUE 'WORD_FAMILY';

-- AlterTable
ALTER TABLE "Word" ADD COLUMN     "word_family" TEXT;

-- AlterTable
ALTER TABLE "exercise_settings_presets" ADD COLUMN     "back_formats" "ContentFormat"[],
ADD COLUMN     "front_formats" "ContentFormat"[];

-- AlterTable
ALTER TABLE "session_questions" ADD COLUMN     "back" JSONB,
ADD COLUMN     "front" JSONB;
