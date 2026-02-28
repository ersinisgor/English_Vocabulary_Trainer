export interface ExcelData {
  wordSheet: WordSheetRow[];
  exampleSheet: ExampleSheetRow[];
  tagSheet: TagSheetRow[];
}

export interface WordSheetRow {
  word_no: number;
  word: string;
  pos: string;
  level: string;
  pronunciation?: string;
  meaning_order: number;
  native_meanings: string;
  english_definition?: string;
}

export interface ExampleSheetRow {
  word_no: number;
  meaning_order: number;
  example_sentence: string;
  translation: string;
}

export interface TagSheetRow {
  word_no: number;
  meaning_order: number;
  name: string;
}
