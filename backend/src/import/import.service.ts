import { Injectable, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ExcelParser } from './utils/excel-parser.util';
import { ExcelData } from './types/excel-data.interface';
import { PartOfSpeech, WordLevel } from 'generated/prisma';
import { normalizeWord } from 'src/common/utils/word.utils';
import { ImportError, ImportResult } from './types/import-result.type';

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  parseExcelFile(buffer: Buffer): ExcelData {
    const excelData = ExcelParser.parseExcelFile(buffer);
    ExcelParser.validateExcelData(excelData);
    return excelData;
  }

  async importFromExcel(
    userId: string,
    excelData: ExcelData,
  ): Promise<ImportResult> {
    const errors: ImportError[] = [];

    // ─── Phase 1: Build all records in memory (zero DB calls) ─────────────
    //
    // Client-side UUIDs let us pre-wire all foreign keys without waiting
    // for the DB to return generated IDs, enabling bulk inserts below.

    type WordRecord = {
      id: string;
      word: string;
      partOfSpeech: PartOfSpeech;
      level: WordLevel | null;
      pronunciation: string | undefined;
      userId: string;
    };
    type MeaningRecord = {
      id: string;
      wordId: string;
      meaningOrder: number;
      englishDefinition: string | undefined;
      nativeMeanings: string;
    };
    type SplittedRecord = {
      id: string;
      meaningId: string;
      order: number;
      meaningText: string;
    };
    type ExampleRecord = {
      id: string;
      meaningId: string;
      sentence: string | undefined;
      translation: string | undefined;
      clozeTemplate: string | undefined;
      answers: string[];
    };
    type TagRecord = { id: string; name: string };
    type TagRelationRecord = { meaningId: string; tagId: string };

    const wordRecords: WordRecord[] = [];
    const meaningRecords: MeaningRecord[] = [];
    const splittedRecords: SplittedRecord[] = [];
    const exampleRecords: ExampleRecord[] = [];

    const wordMap = new Map<number, string>(); // word_no → wordId
    const meaningMap = new Map<string, string>(); // "word_no_meaning_order" → meaningId
    // reverse lookup: "normalizedWord_partOfSpeech" → word_no (needed for duplicate resolution)
    const wordKeyToNo = new Map<string, number>();

    const groupedWords = ExcelParser.groupByWordNo(excelData.wordSheet);

    // ─── Phase 1a: Build word records only ────────────────────────────────
    for (const [wordNo, rows] of groupedWords.entries()) {
      const firstRow = rows[0];

      let posEnum: PartOfSpeech;
      let levelEnum: WordLevel | null;
      try {
        posEnum = this.mapPosToEnum(firstRow.pos);
        levelEnum = this.mapLevelToEnum(firstRow.level);
      } catch (error) {
        errors.push({
          word_no: wordNo,
          field: 'pos/level',
          message: error instanceof Error ? error.message : String(error),
        });
        continue;
      }

      const wordId = randomUUID();
      const normalizedWord = normalizeWord(firstRow.word);

      wordMap.set(wordNo, wordId);
      wordKeyToNo.set(`${normalizedWord}_${posEnum}`, wordNo);
      wordRecords.push({
        id: wordId,
        word: normalizedWord,
        partOfSpeech: posEnum,
        level: levelEnum,
        pronunciation: firstRow.pronunciation,
        userId,
      });
    }

    // ─── Phase 1b: Resolve existing words ─────────────────────────────────
    //
    // If a word already exists in DB, skipDuplicates would silently skip its
    // insert but our meaningRecords would still reference the new client UUID
    // (which was never inserted) → FK violation. Fix: update wordMap to use
    // the existing DB ID before building meanings.
    if (wordRecords.length > 0) {
      const existingWords = await this.prisma.word.findMany({
        where: {
          userId,
          OR: wordRecords.map((w) => ({
            word: w.word,
            partOfSpeech: w.partOfSpeech,
          })),
        },
        select: { id: true, word: true, partOfSpeech: true },
      });

      const existingKeys = new Set<string>();
      for (const existing of existingWords) {
        const key = `${existing.word}_${existing.partOfSpeech}`;
        existingKeys.add(key);
        const wordNo = wordKeyToNo.get(key);
        if (wordNo !== undefined) {
          wordMap.set(wordNo, existing.id); // use real DB id
          errors.push({
            word_no: wordNo,
            field: 'word',
            message: `Word "${existing.word}" (${existing.partOfSpeech}) already exists, skipped`,
          });
        }
      }

      // Keep only truly new words for insertion
      wordRecords.splice(
        0,
        wordRecords.length,
        ...wordRecords.filter(
          (w) => !existingKeys.has(`${w.word}_${w.partOfSpeech}`),
        ),
      );
    }

    // ─── Phase 1c: Build meaning records (wordMap now has correct IDs) ────
    for (const [wordNo, rows] of groupedWords.entries()) {
      const wordId = wordMap.get(wordNo);
      if (!wordId) continue; // failed validation in phase 1a

      for (const row of rows) {
        const meaningId = randomUUID();
        meaningMap.set(`${wordNo}_${row.meaning_order}`, meaningId);
        meaningRecords.push({
          id: meaningId,
          wordId,
          meaningOrder: row.meaning_order,
          englishDefinition: row.english_definition,
          nativeMeanings: row.native_meanings || '',
        });

        const parts = (row.native_meanings || '')
          .split('/')
          .map((p) => p.trim())
          .filter(Boolean);

        parts.forEach((text, i) => {
          splittedRecords.push({
            id: randomUUID(),
            meaningId,
            order: i + 1,
            meaningText: text,
          });
        });
      }
    }

    for (const row of excelData.exampleSheet) {
      const meaningId = meaningMap.get(`${row.word_no}_${row.meaning_order}`);
      if (!meaningId) {
        errors.push({
          word_no: row.word_no,
          meaning_order: row.meaning_order,
          field: 'example_sentence',
          message: 'Referenced meaning not found',
        });
        continue;
      }
      exampleRecords.push({
        id: randomUUID(),
        meaningId,
        sentence: row.example_sentence,
        translation: row.translation,
        clozeTemplate: row.example_sentence,
        answers: this.extractClozeAnswers(row.example_sentence || ''),
      });
    }

    // ─── Phase 2: Resolve tags with a single query ─────────────────────────
    //
    // Collect every unique tag name from the sheet, fetch existing ones in one
    // query, create only the new ones. Dedup relations in-memory with a Set.

    const allTagNames = new Set<string>();
    const tagRowsWithMeaning: Array<{ meaningId: string; tagName: string }> =
      [];

    for (const row of excelData.tagSheet) {
      if (!row.name) continue;
      const cleanName = this.cleanTagName(row.name);
      if (!cleanName) continue;

      const meaningId = meaningMap.get(`${row.word_no}_${row.meaning_order}`);
      if (!meaningId) {
        errors.push({
          word_no: row.word_no,
          meaning_order: row.meaning_order,
          field: 'tags',
          message: 'Referenced meaning not found',
        });
        continue;
      }

      allTagNames.add(cleanName);
      tagRowsWithMeaning.push({ meaningId, tagName: cleanName });
    }

    const existingTags =
      allTagNames.size > 0
        ? await this.prisma.tag.findMany({
            where: { name: { in: [...allTagNames] } },
            select: { id: true, name: true },
          })
        : [];

    const tagNameToId = new Map(existingTags.map((t) => [t.name, t.id]));

    const newTagRecords: TagRecord[] = [];
    for (const name of allTagNames) {
      if (!tagNameToId.has(name)) {
        const id = randomUUID();
        tagNameToId.set(name, id);
        newTagRecords.push({ id, name });
      }
    }

    const tagRelationRecords: TagRelationRecord[] = [];
    const seenRelations = new Set<string>();
    for (const { meaningId, tagName } of tagRowsWithMeaning) {
      const tagId = tagNameToId.get(tagName);
      if (!tagId) continue;
      const key = `${meaningId}_${tagId}`;
      if (!seenRelations.has(key)) {
        seenRelations.add(key);
        tagRelationRecords.push({ meaningId, tagId });
      }
    }

    // ─── Phase 3: Sequential bulk inserts ─────────────────────────────────
    //
    // Prisma Accelerate's $transaction([...]) array form does NOT wrap
    // operations in a single DB transaction — each operation goes through a
    // separate Accelerate connection. This means child records cannot see
    // parent records inserted in the same $transaction batch, causing FK
    // violations. Sequential awaits guarantee each insert is committed and
    // visible before the next dependent insert runs.

    const wordsResult = await this.prisma.word.createMany({
      data: wordRecords,
      skipDuplicates: true,
    });
    const meaningsResult = await this.prisma.wordMeaning.createMany({
      data: meaningRecords,
      skipDuplicates: true,
    });
    const splittedResult = await this.prisma.splittedNativeMeaning.createMany({
      data: splittedRecords,
      skipDuplicates: true,
    });
    const examplesResult = await this.prisma.exampleSentence.createMany({
      data: exampleRecords,
      skipDuplicates: true,
    });
    await this.prisma.tag.createMany({
      data: newTagRecords,
      skipDuplicates: true,
    });
    const tagRelationsResult = await this.prisma.wordMeaningTag.createMany({
      data: tagRelationRecords,
      skipDuplicates: true,
    });

    return {
      totalWords: wordsResult.count,
      totalMeanings: meaningsResult.count,
      totalSplittedMeanings: splittedResult.count,
      totalExamples: examplesResult.count,
      totalTags: tagRelationsResult.count,
      errors,
    };
  }

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
      EXP: PartOfSpeech.EXPRESSION,
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

  cleanTagName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  extractClozeAnswers(sentence: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = sentence.match(regex);
    if (!matches) return [];
    return matches.map((match) => match.replace(/\{\{|\}\}/g, ''));
  }
}
