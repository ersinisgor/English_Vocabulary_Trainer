-- CreateTable
CREATE TABLE "WordMeaning" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "isPrimaryMeaning" BOOLEAN NOT NULL DEFAULT false,
    "meaningOrder" INTEGER NOT NULL,
    "englishDefinition" TEXT NOT NULL,
    "nativeMeanings" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WordMeaning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SplittedNativeMeaning" (
    "id" TEXT NOT NULL,
    "meaningId" TEXT NOT NULL,
    "meaningText" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "sideNotes" TEXT[],

    CONSTRAINT "SplittedNativeMeaning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExampleSentence" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "sentence" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "clozeDeletedWord" BOOLEAN NOT NULL,
    "clozePosition" INTEGER,
    "boldIndexes" INTEGER[],
    "highlightedWord" TEXT NOT NULL,

    CONSTRAINT "ExampleSentence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSentence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "sentence" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "hideWord" BOOLEAN NOT NULL DEFAULT false,
    "highlightedWord" TEXT NOT NULL,

    CONSTRAINT "UserSentence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordMetadata" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "pronunciation" TEXT,
    "imageUrl" TEXT,
    "singularForm" TEXT,
    "pluralForm" TEXT,
    "possessiveForm" TEXT,
    "regularForms" TEXT[],
    "irregularV2" TEXT,
    "irregularV3" TEXT,
    "presentParticiple" TEXT,
    "thirdPersonSingular" TEXT,
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
    "wordId" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "Synonym_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Antonym" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "Antonym_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelatedWord" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "RelatedWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWordState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "keepLearning" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserWordState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WordMeaning_wordId_idx" ON "WordMeaning"("wordId");

-- CreateIndex
CREATE INDEX "SplittedNativeMeaning_meaningId_idx" ON "SplittedNativeMeaning"("meaningId");

-- CreateIndex
CREATE INDEX "ExampleSentence_wordId_idx" ON "ExampleSentence"("wordId");

-- CreateIndex
CREATE INDEX "UserSentence_userId_idx" ON "UserSentence"("userId");

-- CreateIndex
CREATE INDEX "UserSentence_wordId_idx" ON "UserSentence"("wordId");

-- CreateIndex
CREATE UNIQUE INDEX "WordMetadata_wordId_key" ON "WordMetadata"("wordId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "UserWordState_userId_idx" ON "UserWordState"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserWordState_userId_wordId_key" ON "UserWordState"("userId", "wordId");

-- CreateIndex
CREATE INDEX "Word_userId_createdAt_idx" ON "Word"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Word_userId_level_partOfSpeech_idx" ON "Word"("userId", "level", "partOfSpeech");

-- AddForeignKey
ALTER TABLE "WordMeaning" ADD CONSTRAINT "WordMeaning_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplittedNativeMeaning" ADD CONSTRAINT "SplittedNativeMeaning_meaningId_fkey" FOREIGN KEY ("meaningId") REFERENCES "WordMeaning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExampleSentence" ADD CONSTRAINT "ExampleSentence_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSentence" ADD CONSTRAINT "UserSentence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSentence" ADD CONSTRAINT "UserSentence_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordMetadata" ADD CONSTRAINT "WordMetadata_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordTag" ADD CONSTRAINT "WordTag_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordTag" ADD CONSTRAINT "WordTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Synonym" ADD CONSTRAINT "Synonym_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Antonym" ADD CONSTRAINT "Antonym_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatedWord" ADD CONSTRAINT "RelatedWord_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWordState" ADD CONSTRAINT "UserWordState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWordState" ADD CONSTRAINT "UserWordState_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;
