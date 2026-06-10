-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExerciseType" ADD VALUE 'WRITING';
ALTER TYPE "ExerciseType" ADD VALUE 'TRUE_FALSE';
ALTER TYPE "ExerciseType" ADD VALUE 'MATCHING';
ALTER TYPE "ExerciseType" ADD VALUE 'FIND_IN_SENTENCE';

-- AlterTable
ALTER TABLE "session_questions" ADD COLUMN     "prompt" TEXT;

-- CreateTable
CREATE TABLE "folders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_lists" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "folder_id" TEXT,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "word_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_list_items" (
    "word_list_id" TEXT NOT NULL,
    "word_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "word_list_items_pkey" PRIMARY KEY ("word_list_id","word_id")
);

-- CreateTable
CREATE TABLE "exercise_settings_presets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "exercise_type" "ExerciseType" NOT NULL,
    "language_setting" "LanguageSetting" NOT NULL,
    "question_count" INTEGER NOT NULL DEFAULT 10,
    "number_of_options" INTEGER NOT NULL DEFAULT 4,
    "folder_ids" TEXT[],
    "word_list_ids" TEXT[],
    "levels" "WordLevel"[],
    "parts_of_speech" "PartOfSpeech"[],
    "only_starred" BOOLEAN NOT NULL DEFAULT false,
    "only_keep_learning" BOOLEAN NOT NULL DEFAULT false,
    "exclude_learned" BOOLEAN NOT NULL DEFAULT true,
    "tag_ids" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercise_settings_presets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "folders_user_id_idx" ON "folders"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "folders_user_id_name_key" ON "folders"("user_id", "name");

-- CreateIndex
CREATE INDEX "word_lists_user_id_idx" ON "word_lists"("user_id");

-- CreateIndex
CREATE INDEX "word_lists_folder_id_idx" ON "word_lists"("folder_id");

-- CreateIndex
CREATE UNIQUE INDEX "word_lists_user_id_name_key" ON "word_lists"("user_id", "name");

-- CreateIndex
CREATE INDEX "word_list_items_word_id_idx" ON "word_list_items"("word_id");

-- CreateIndex
CREATE INDEX "exercise_settings_presets_user_id_idx" ON "exercise_settings_presets"("user_id");

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_lists" ADD CONSTRAINT "word_lists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_lists" ADD CONSTRAINT "word_lists_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_list_items" ADD CONSTRAINT "word_list_items_word_list_id_fkey" FOREIGN KEY ("word_list_id") REFERENCES "word_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_list_items" ADD CONSTRAINT "word_list_items_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_settings_presets" ADD CONSTRAINT "exercise_settings_presets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
