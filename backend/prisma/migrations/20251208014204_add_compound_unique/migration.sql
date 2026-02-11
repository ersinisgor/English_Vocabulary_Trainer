/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `isDeleted` on the `Word` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[word,partOfSpeech]` on the table `Word` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Word_word_key";

-- AlterTable
ALTER TABLE "Word" DROP COLUMN "deletedAt",
DROP COLUMN "isDeleted";

-- CreateIndex
CREATE UNIQUE INDEX "Word_word_partOfSpeech_key" ON "Word"("word", "partOfSpeech");
