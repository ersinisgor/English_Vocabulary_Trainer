import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ExcelParser } from './utils/excel-parser.util';
import { ExcelData } from './types/excel-data.interface';
import { PartOfSpeech, WordLevel } from 'generated/prisma';
import { normalizeWord } from 'src/common/utils/word.utils';
import { ImportError } from './types/import-result.type';

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Parse Excel file from buffer
   */
  async parseExcelFile(buffer: Buffer): Promise<ExcelData> {
    const excelData = ExcelParser.parseExcelFile(buffer);
    ExcelParser.validateExcelData(excelData);
    return excelData;
  }

  /**
   * Import words from parsed Excel data
   */
  async importFromExcel(userId: string, excelData: ExcelData) {
    return await this.prisma.$transaction(async (tx) => {
      const wordMap: Map<number, string> = new Map();
      const meaningMap: Map<string, string> = new Map();
      const errors: ImportError[] = [];

      let totalWords = 0;
      let totalMeanings = 0;
      let totalSplittedMeanings = 0;
      let totalExamples = 0;
      let totalTags = 0;

      // Group word rows by word_no
      const groupedWords = ExcelParser.groupByWordNo(excelData.wordSheet);

      // Process each word group
      for (const [wordNo, rows] of groupedWords.entries()) {
        const firstRow = rows[0];

        try {
          // Validate and map POS/Level
          const posEnum = this.mapPosToEnum(firstRow.pos);
          const levelEnum = this.mapLevelToEnum(firstRow.level);

          // Create Word
          const word = await tx.word.create({
            data: {
              word: normalizeWord(firstRow.word),
              partOfSpeech: posEnum,
              level: levelEnum,
              pronunciation: firstRow.pronunciation,
              userId,
            },
          });
          wordMap.set(wordNo, word.id);
          totalWords++;

          // Create Meanings
          for (const row of rows) {
            const meaning = await tx.wordMeaning.create({
              data: {
                wordId: word.id,
                meaningOrder: row.meaning_order,
                englishDefinition: row.english_definition,
                nativeMeanings: row.native_meanings,
              },
            });
            const key = `${wordNo}_${row.meaning_order}`;
            meaningMap.set(key, meaning.id);
            totalMeanings++;

            // Create Splitted Native Meanings
            const parts = row.native_meanings.split('/');
            for (let i = 0; i < parts.length; i++) {
              const trimmed = parts[i].trim();
              if (trimmed) {
                await tx.splittedNativeMeaning.create({
                  data: {
                    meaningId: meaning.id,
                    order: i + 1,
                    meaningText: trimmed,
                  },
                });
                totalSplittedMeanings++;
              }
            }
          }
        } catch (error) {
          if (error instanceof Error) {
            errors.push({
              word_no: wordNo,
              field: 'word',
              message: error.message,
            });
          }
        }
      }

      // Import Examples
      for (const row of excelData.exampleSheet) {
        const key = `${row.word_no}_${row.meaning_order}`;
        const meaningId = meaningMap.get(key);
        if (!meaningId) {
          errors.push({
            word_no: row.word_no,
            meaning_order: row.meaning_order,
            field: 'example_sentence',
            message: 'Referenced meaning not found',
          });
          continue;
        }

        // Extract cloze answers from {{word}} pattern
        const answers = this.extractClozeAnswers(row.example_sentence);

        try {
          await tx.exampleSentence.create({
            data: {
              meaningId,
              sentence: row.example_sentence,
              translation: row.translation,
              clozeTemplate: row.example_sentence,
              answers,
            },
          });
          totalExamples++;
        } catch (error) {
          if (error instanceof Error) {
            errors.push({
              word_no: row.word_no,
              meaning_order: row.meaning_order,
              field: 'example_sentence',
              message: error.message,
            });
          }
        }
      }

      // Import Tags
      const processedTagKeys = new Set<string>();

      for (const row of excelData.tagSheet) {
        const key = `${row.word_no}_${row.meaning_order}_${row.name}`;
        if (processedTagKeys.has(key)) {
          continue; // Skip duplicate tag entries
        }
        processedTagKeys.add(key);

        const meaningKey = `${row.word_no}_${row.meaning_order}`;
        const meaningId = meaningMap.get(meaningKey);
        if (!meaningId) {
          errors.push({
            word_no: row.word_no,
            meaning_order: row.meaning_order,
            field: 'tags',
            message: 'Referenced meaning not found',
          });
          continue;
        }

        // Clean tag name
        const cleanTag = this.cleanTagName(row.name);

        try {
          // Upsert tag
          const tag = await tx.tag.upsert({
            where: { name: cleanTag },
            update: {},
            create: { name: cleanTag },
          });

          // Check if relationship already exists
          const existingRelation = await tx.wordMeaningTag.findUnique({
            where: {
              meaningId_tagId: {
                meaningId,
                tagId: tag.id,
              },
            },
          });

          if (!existingRelation) {
            await tx.wordMeaningTag.create({
              data: {
                meaningId,
                tagId: tag.id,
              },
            });
            totalTags++;
          }
        } catch (error) {
          if (error instanceof Error) {
            errors.push({
              word_no: row.word_no,
              meaning_order: row.meaning_order,
              field: 'tags',
              message: error.message,
            });
          }
        }
      }

      return {
        totalWords,
        totalMeanings,
        totalSplittedMeanings,
        totalExamples,
        totalTags,
        errors,
      };
    });
  }

  /**
   * Map Excel POS value to Prisma enum
   */
  mapPosToEnum(pos: string): PartOfSpeech {
    const posMap: Record<string, PartOfSpeech> = {
      V: PartOfSpeech.VERB,
      VERB: PartOfSpeech.VERB,
      NOUN: PartOfSpeech.NOUN,
      N: PartOfSpeech.NOUN,
      ADJECTIVE: PartOfSpeech.ADJECTIVE,
      ADJ: PartOfSpeech.ADJECTIVE,
      A: PartOfSpeech.ADJECTIVE,
      ADVERB: PartOfSpeech.ADVERB,
      ADV: PartOfSpeech.ADVERB,
      PHRASAL_VERB: PartOfSpeech.PHRASAL_VERB,
      PV: PartOfSpeech.PHRASAL_VERB,
      IDIOM: PartOfSpeech.IDIOM,
      EXPRESSION: PartOfSpeech.EXPRESSION,
    };

    const normalized = pos.toUpperCase().trim();
    const mapped = posMap[normalized];

    if (!mapped) {
      throw new BadRequestException(
        `Invalid part of speech: ${pos}. Valid values: V, NOUN, ADJECTIVE, ADVERB, PHRASAL_VERB, IDIOM, EXPRESSION`,
      );
    }

    return mapped;
  }

  /**
   * Map Excel level value to Prisma enum
   */
  mapLevelToEnum(level: string): WordLevel | null {
    if (!level) return null;

    const normalized = level.toUpperCase().trim();

    const validLevels: WordLevel[] = [
      WordLevel.A1,
      WordLevel.A2,
      WordLevel.B1,
      WordLevel.B2,
      WordLevel.C1,
      WordLevel.C2,
    ];

    const matched = validLevels.find((l) => l === normalized);

    if (!matched) {
      throw new BadRequestException(
        `Invalid level: ${level}. Valid values: A1, A2, B1, B2, C1, C2`,
      );
    }

    return matched;
  }

  /**
   * Clean tag name for storage
   */
  cleanTagName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Extract cloze answers from {{word}} pattern
   */
  extractClozeAnswers(sentence: string): string[] {
    // Match all {{word}} patterns
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = sentence.match(regex);

    if (!matches) {
      return [];
    }

    // Extract words from the patterns
    return matches.map((match) => {
      return match.replace(/\{\{|\}\}/g, '');
    });
  }
}
