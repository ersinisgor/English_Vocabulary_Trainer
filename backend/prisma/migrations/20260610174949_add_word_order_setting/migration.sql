-- CreateEnum
CREATE TYPE "WordOrder" AS ENUM ('LIST', 'RANDOM');

-- AlterTable
ALTER TABLE "exercise_settings_presets" ADD COLUMN     "word_order" "WordOrder" NOT NULL DEFAULT 'RANDOM';
