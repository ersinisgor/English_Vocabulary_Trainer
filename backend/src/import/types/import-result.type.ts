export interface ImportError {
  word_no?: number;
  meaning_order?: number;
  field: string;
  message: string;
}

export interface ImportResult {
  totalWords: number;
  totalMeanings: number;
  totalSplittedMeanings: number;
  totalExamples: number;
  totalTags: number;
  errors: ImportError[];
}
