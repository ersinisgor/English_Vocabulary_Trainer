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
  pronunciation?: string | undefined;
  meaning_order: number;
  native_meanings?: string | undefined;
  english_definition?: string | undefined;
}

export interface ExampleSheetRow {
  word_no: number;
  meaning_order: number;
  example_sentence?: string | undefined;
  translation?: string | undefined;
}

export interface TagSheetRow {
  word_no: number;
  meaning_order: number;
  name?: string | undefined;
}
