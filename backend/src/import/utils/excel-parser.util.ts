import * as XLSX from 'xlsx';
import { ExcelData, WordSheetRow, ExampleSheetRow, TagSheetRow } from '../types/excel-data.interface';
import { BadRequestException } from '@nestjs/common';

export class ExcelParser {
  /**
   * Parse Excel file buffer to structured data
   */
  static parseExcelFile(buffer: Buffer): ExcelData {
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Validate required sheets
    const requiredSheets = ['Words-WordMeaning', 'ExampleSentence', 'WordTag'];
    const missingSheets = requiredSheets.filter(
      (sheet) => !workbook.SheetNames.includes(sheet),
    );

    if (missingSheets.length > 0) {
      throw new BadRequestException(
        `Missing required sheets: ${missingSheets.join(', ')}`,
      );
    }

    // Parse each sheet
    const wordSheet = this.parseSheet<WordSheetRow>(
      workbook,
      'Words-WordMeaning',
    );
    const exampleSheet = this.parseSheet<ExampleSheetRow>(
      workbook,
      'ExampleSentence',
    );
    const tagSheet = this.parseSheet<TagSheetRow>(workbook, 'WordTag');

    return {
      wordSheet,
      exampleSheet,
      tagSheet,
    };
  }

  /**
   * Parse a single sheet to typed array
   */
  private static parseSheet<T>(workbook: XLSX.WorkBook, sheetName: string): T[] {
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<T>(sheet);

    if (!rawData || rawData.length === 0) {
      return [];
    }

    return rawData;
  }

  /**
   * Validate Excel data structure
   */
  static validateExcelData(data: ExcelData): void {
    // Validate word sheet has required fields
    if (data.wordSheet.length === 0) {
      throw new BadRequestException('Word sheet cannot be empty');
    }

    // Check for required fields in first row
    const firstWord = data.wordSheet[0];
    if (
      !firstWord.word ||
      !firstWord.pos ||
      !firstWord.meaning_order ||
      !firstWord.native_meanings
    ) {
      throw new BadRequestException(
        'Word sheet missing required fields: word, pos, meaning_order, native_meanings',
      );
    }
  }

  /**
   * Group word rows by word_no
   */
  static groupByWordNo(rows: WordSheetRow[]): Map<number, WordSheetRow[]> {
    const grouped = new Map<number, WordSheetRow[]>();

    for (const row of rows) {
      const wordNo = row.word_no;
      if (!grouped.has(wordNo)) {
        grouped.set(wordNo, []);
      }
      grouped.get(wordNo)!.push(row);
    }

    return grouped;
  }
}
