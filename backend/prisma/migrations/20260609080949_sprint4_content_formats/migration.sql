-- CreateEnum
CREATE TYPE "ContentFormat" AS ENUM ('ENGLISH_WORD', 'ENGLISH_DEFINITION', 'ENGLISH_SENTENCE', 'NATIVE_MEANING', 'NATIVE_SENTENCE');

-- AlterTable
ALTER TABLE "exercise_settings_presets" ADD COLUMN     "answer_format" "ContentFormat",
ADD COLUMN     "example_order" INTEGER,
ADD COLUMN     "question_format" "ContentFormat";
