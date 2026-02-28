-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "PartOfSpeech" AS ENUM ('NOUN', 'VERB', 'ADJECTIVE', 'ADVERB', 'PHRASAL_VERB', 'IDIOM', 'EXPRESSION');

-- CreateEnum
CREATE TYPE "WordLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Word" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "level" "WordLevel",
    "part_of_speech" "PartOfSpeech" NOT NULL,
    "pronunciation" TEXT,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordMeaning" (
    "id" TEXT NOT NULL,
    "word_id" TEXT NOT NULL,
    "meaning_order" INTEGER NOT NULL,
    "english_definition" TEXT,
    "native_meanings" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WordMeaning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SplittedNativeMeaning" (
    "id" TEXT NOT NULL,
    "meaning_id" TEXT NOT NULL,
    "meaning_text" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "SplittedNativeMeaning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExampleSentence" (
    "id" TEXT NOT NULL,
    "meaning_id" TEXT NOT NULL,
    "sentence" TEXT,
    "translation" TEXT,
    "clozeTemplate" TEXT,
    "answers" TEXT[],

    CONSTRAINT "ExampleSentence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordMeaningTag" (
    "meaningId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "WordMeaningTag_pkey" PRIMARY KEY ("meaningId","tagId")
);

-- CreateTable
CREATE TABLE "UserMeaningState" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "meaning_id" TEXT NOT NULL,
    "is_starred" BOOLEAN NOT NULL DEFAULT false,
    "keep_learning" BOOLEAN NOT NULL DEFAULT true,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "wrong_count" INTEGER NOT NULL DEFAULT 0,
    "practice_count" INTEGER NOT NULL DEFAULT 0,
    "streak_count" INTEGER NOT NULL DEFAULT 0,
    "repetition" INTEGER NOT NULL DEFAULT 0,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "ease_factor" DECIMAL(4,2) NOT NULL DEFAULT 2.5,
    "first_review_at" TIMESTAMP(3),
    "last_review_at" TIMESTAMP(3),
    "next_review_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMeaningState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RefreshToken_user_id_idx" ON "RefreshToken"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Word_user_id_idx" ON "Word"("user_id");

-- CreateIndex
CREATE INDEX "Word_user_id_created_at_idx" ON "Word"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "Word_user_id_level_part_of_speech_idx" ON "Word"("user_id", "level", "part_of_speech");

-- CreateIndex
CREATE UNIQUE INDEX "Word_user_id_word_part_of_speech_key" ON "Word"("user_id", "word", "part_of_speech");

-- CreateIndex
CREATE INDEX "WordMeaning_word_id_idx" ON "WordMeaning"("word_id");

-- CreateIndex
CREATE UNIQUE INDEX "WordMeaning_word_id_meaning_order_key" ON "WordMeaning"("word_id", "meaning_order");

-- CreateIndex
CREATE INDEX "SplittedNativeMeaning_meaning_id_idx" ON "SplittedNativeMeaning"("meaning_id");

-- CreateIndex
CREATE INDEX "ExampleSentence_meaning_id_idx" ON "ExampleSentence"("meaning_id");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "WordMeaningTag_tagId_idx" ON "WordMeaningTag"("tagId");

-- CreateIndex
CREATE INDEX "UserMeaningState_user_id_idx" ON "UserMeaningState"("user_id");

-- CreateIndex
CREATE INDEX "UserMeaningState_user_id_is_starred_idx" ON "UserMeaningState"("user_id", "is_starred");

-- CreateIndex
CREATE INDEX "UserMeaningState_user_id_keep_learning_idx" ON "UserMeaningState"("user_id", "keep_learning");

-- CreateIndex
CREATE INDEX "UserMeaningState_user_id_next_review_at_idx" ON "UserMeaningState"("user_id", "next_review_at");

-- CreateIndex
CREATE UNIQUE INDEX "UserMeaningState_user_id_meaning_id_key" ON "UserMeaningState"("user_id", "meaning_id");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordMeaning" ADD CONSTRAINT "WordMeaning_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplittedNativeMeaning" ADD CONSTRAINT "SplittedNativeMeaning_meaning_id_fkey" FOREIGN KEY ("meaning_id") REFERENCES "WordMeaning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExampleSentence" ADD CONSTRAINT "ExampleSentence_meaning_id_fkey" FOREIGN KEY ("meaning_id") REFERENCES "WordMeaning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordMeaningTag" ADD CONSTRAINT "WordMeaningTag_meaningId_fkey" FOREIGN KEY ("meaningId") REFERENCES "WordMeaning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordMeaningTag" ADD CONSTRAINT "WordMeaningTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMeaningState" ADD CONSTRAINT "UserMeaningState_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMeaningState" ADD CONSTRAINT "UserMeaningState_meaning_id_fkey" FOREIGN KEY ("meaning_id") REFERENCES "WordMeaning"("id") ON DELETE CASCADE ON UPDATE CASCADE;
