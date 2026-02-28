import { Expose } from 'class-transformer';
import { ImportError } from '../types/import-result.type';

export class ImportErrorDTO {
  @Expose()
  word_no?: number;

  @Expose()
  meaning_order?: number;

  @Expose()
  field: string;

  @Expose()
  message: string;
}

export class ImportResponseDTO {
  @Expose()
  totalWords: number;

  @Expose()
  totalMeanings: number;

  @Expose()
  totalSplittedMeanings: number;

  @Expose()
  totalExamples: number;

  @Expose()
  totalTags: number;

  @Expose()
  errors: ImportErrorDTO[];
}

export function toImportResponseDTO(
  result: any,
  errors: ImportError[],
): ImportResponseDTO {
  return {
    totalWords: result.totalWords || 0,
    totalMeanings: result.totalMeanings || 0,
    totalSplittedMeanings: result.totalSplittedMeanings || 0,
    totalExamples: result.totalExamples || 0,
    totalTags: result.totalTags || 0,
    errors: errors,
  };
}
