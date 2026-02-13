-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "PartOfSpeech" AS ENUM ('NOUN', 'VERB', 'ADJECTIVE', 'ADVERB', 'PHRASAL_VERB', 'IDIOM');

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
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordMeaning" (
    "id" TEXT NOT NULL,
    "word_id" TEXT NOT NULL,
    "is_primary_meaning" BOOLEAN NOT NULL DEFAULT false,
    "meaning_order" INTEGER NOT NULL,
    "english_definition" TEXT NOT NULL,
    "native_meanings" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WordMeaning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SplittedNativeMeaning" (
    "id" TEXT NOT NULL,
    "meaning_id" TEXT NOT NULL,
    "meaning_text" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "side_notes" TEXT[],

    CONSTRAINT "SplittedNativeMeaning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExampleSentence" (
    "id" TEXT NOT NULL,
    "word_id" TEXT NOT NULL,
    "sentence" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "cloze_deleted_word" BOOLEAN NOT NULL,
    "cloze_position" INTEGER,
    "bold_indexes" INTEGER[],
    "highlighted_word" TEXT NOT NULL,

    CONSTRAINT "ExampleSentence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSentence" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "word_id" TEXT NOT NULL,
    "sentence" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "hide_word" BOOLEAN NOT NULL DEFAULT false,
    "highlighted_word" TEXT NOT NULL,

    CONSTRAINT "UserSentence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordMetadata" (
    "id" TEXT NOT NULL,
    "word_id" TEXT NOT NULL,
    "pronunciation" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "singular_form" TEXT,
    "plural_form" TEXT,
    "possessive_form" TEXT,
    "regular_forms" TEXT[],
    "irregular_v2" TEXT,
    "irregular_v3" TEXT,
    "present_participle" TEXT,
    "third_person_singular" TEXT,
    "gerund" TEXT,
    "infinitive" TEXT,

    CONSTRAINT "WordMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordTag" (
    "wordId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "WordTag_pkey" PRIMARY KEY ("wordId","tagId")
);

-- CreateTable
CREATE TABLE "Synonym" (
    "id" TEXT NOT NULL,
    "word_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "Synonym_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Antonym" (
    "id" TEXT NOT NULL,
    "word_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "Antonym_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelatedWord" (
    "id" TEXT NOT NULL,
    "word_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "RelatedWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWordState" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "word_id" TEXT NOT NULL,
    "is_starred" BOOLEAN NOT NULL DEFAULT false,
    "keep_learning" BOOLEAN NOT NULL DEFAULT true,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "wrong_count" INTEGER NOT NULL DEFAULT 0,
    "practice_count" INTEGER NOT NULL DEFAULT 0,
    "streak_count" INTEGER NOT NULL DEFAULT 0,
    "repetition" INTEGER NOT NULL DEFAULT 0,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "ease_factor" DECIMAL(65,30) NOT NULL DEFAULT 2.5,
    "first_review_at" TIMESTAMP(3),
    "last_review_at" TIMESTAMP(3),
    "next_review_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWordState_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "SplittedNativeMeaning_meaning_id_idx" ON "SplittedNativeMeaning"("meaning_id");

-- CreateIndex
CREATE INDEX "ExampleSentence_word_id_idx" ON "ExampleSentence"("word_id");

-- CreateIndex
CREATE INDEX "UserSentence_user_id_idx" ON "UserSentence"("user_id");

-- CreateIndex
CREATE INDEX "UserSentence_word_id_idx" ON "UserSentence"("word_id");

-- CreateIndex
CREATE UNIQUE INDEX "WordMetadata_word_id_key" ON "WordMetadata"("word_id");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "UserWordState_user_id_idx" ON "UserWordState"("user_id");

-- CreateIndex
CREATE INDEX "UserWordState_user_id_is_starred_idx" ON "UserWordState"("user_id", "is_starred");

-- CreateIndex
CREATE INDEX "UserWordState_user_id_keep_learning_idx" ON "UserWordState"("user_id", "keep_learning");

-- CreateIndex
CREATE INDEX "UserWordState_user_id_next_review_at_idx" ON "UserWordState"("user_id", "next_review_at");

-- CreateIndex
CREATE UNIQUE INDEX "UserWordState_user_id_word_id_key" ON "UserWordState"("user_id", "word_id");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordMeaning" ADD CONSTRAINT "WordMeaning_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplittedNativeMeaning" ADD CONSTRAINT "SplittedNativeMeaning_meaning_id_fkey" FOREIGN KEY ("meaning_id") REFERENCES "WordMeaning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExampleSentence" ADD CONSTRAINT "ExampleSentence_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSentence" ADD CONSTRAINT "UserSentence_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSentence" ADD CONSTRAINT "UserSentence_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordMetadata" ADD CONSTRAINT "WordMetadata_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordTag" ADD CONSTRAINT "WordTag_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordTag" ADD CONSTRAINT "WordTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Synonym" ADD CONSTRAINT "Synonym_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Antonym" ADD CONSTRAINT "Antonym_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatedWord" ADD CONSTRAINT "RelatedWord_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWordState" ADD CONSTRAINT "UserWordState_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWordState" ADD CONSTRAINT "UserWordState_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;
