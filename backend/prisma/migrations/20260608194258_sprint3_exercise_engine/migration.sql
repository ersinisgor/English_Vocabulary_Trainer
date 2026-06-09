-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('FLASH_CARD', 'MULTIPLE_CHOICE');

-- CreateEnum
CREATE TYPE "LanguageSetting" AS ENUM ('ENGLISH_NATIVE', 'ENGLISH_ENGLISH');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "exercise_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "exercise_type" "ExerciseType" NOT NULL,
    "language_setting" "LanguageSetting" NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "total_questions" INTEGER NOT NULL,
    "answered_count" INTEGER NOT NULL DEFAULT 0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "wrong_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "exercise_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_questions" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "meaning_id" TEXT NOT NULL,
    "question_order" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "correct_answer" TEXT NOT NULL,
    "options" TEXT[],
    "is_answered" BOOLEAN NOT NULL DEFAULT false,
    "is_correct" BOOLEAN,
    "user_answer" TEXT,
    "answered_at" TIMESTAMP(3),

    CONSTRAINT "session_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exercise_sessions_user_id_idx" ON "exercise_sessions"("user_id");

-- CreateIndex
CREATE INDEX "exercise_sessions_user_id_status_idx" ON "exercise_sessions"("user_id", "status");

-- CreateIndex
CREATE INDEX "session_questions_session_id_idx" ON "session_questions"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_questions_session_id_question_order_key" ON "session_questions"("session_id", "question_order");

-- AddForeignKey
ALTER TABLE "exercise_sessions" ADD CONSTRAINT "exercise_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_questions" ADD CONSTRAINT "session_questions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "exercise_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_questions" ADD CONSTRAINT "session_questions_meaning_id_fkey" FOREIGN KEY ("meaning_id") REFERENCES "WordMeaning"("id") ON DELETE CASCADE ON UPDATE CASCADE;
