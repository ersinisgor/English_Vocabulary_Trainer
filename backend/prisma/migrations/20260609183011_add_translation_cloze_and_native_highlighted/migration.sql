-- AlterEnum
ALTER TYPE "ContentFormat" ADD VALUE 'NATIVE_SENTENCE_HIGHLIGHTED';

-- AlterTable
ALTER TABLE "ExampleSentence" ADD COLUMN     "translation_answers" TEXT[],
ADD COLUMN     "translation_template" TEXT;
