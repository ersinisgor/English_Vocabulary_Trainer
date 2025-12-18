/*
  Warnings:

  - A unique constraint covering the columns `[userId,word,partOfSpeech]` on the table `Word` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Word` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Word_word_partOfSpeech_key";

-- AlterTable
ALTER TABLE "Word" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Word_userId_idx" ON "Word"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Word_userId_word_partOfSpeech_key" ON "Word"("userId", "word", "partOfSpeech");

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
