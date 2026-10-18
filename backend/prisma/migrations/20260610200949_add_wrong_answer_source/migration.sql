-- CreateEnum
CREATE TYPE "WrongAnswerSource" AS ENUM ('SAME', 'ALL', 'FOLDERS', 'DATE_RANGE');

-- AlterTable
ALTER TABLE "exercise_settings_presets" ADD COLUMN     "wrong_answer_folder_ids" TEXT[],
ADD COLUMN     "wrong_answer_from" TIMESTAMP(3),
ADD COLUMN     "wrong_answer_source" "WrongAnswerSource" NOT NULL DEFAULT 'SAME',
ADD COLUMN     "wrong_answer_to" TIMESTAMP(3),
ADD COLUMN     "wrong_answer_word_list_ids" TEXT[];
