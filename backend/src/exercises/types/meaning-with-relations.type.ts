import {
  ExampleSentence,
  SplittedNativeMeaning,
  Word,
  WordMeaning,
} from 'generated/prisma';

export type MeaningWithRelations = WordMeaning & {
  word: Word;
  splittedNativeMeanings: SplittedNativeMeaning[];
  examples: ExampleSentence[];
};
