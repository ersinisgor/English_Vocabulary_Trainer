import { Injectable } from '@nestjs/common';
import { ExerciseType, LanguageSetting, SplittedNativeMeaning, Word, WordMeaning } from 'generated/prisma';
import { GeneratedQuestion } from './types/generated-question.type';
import { shuffle } from 'src/common/utils/array.utils';

type MeaningWithWord = WordMeaning & {
  word: Word;
  splittedNativeMeanings: SplittedNativeMeaning[];
};

@Injectable()
export class QuestionGeneratorService {
  generateQuestion(
    meaning: MeaningWithWord,
    exerciseType: ExerciseType,
    languageSetting: LanguageSetting,
    allMeanings: MeaningWithWord[],
  ): GeneratedQuestion {
    const questionText = meaning.word.word;
    const correctAnswer = this.buildAnswer(meaning, languageSetting);

    if (exerciseType === ExerciseType.FLASH_CARD) {
      return { questionText, correctAnswer, options: [] };
    }

    const distractors = this.buildDistractors(meaning, languageSetting, allMeanings, correctAnswer);
    const options = shuffle([correctAnswer, ...distractors]);

    return { questionText, correctAnswer, options };
  }

  private buildAnswer(meaning: MeaningWithWord, languageSetting: LanguageSetting): string {
    if (languageSetting === LanguageSetting.ENGLISH_ENGLISH) {
      return meaning.englishDefinition ?? meaning.nativeMeanings;
    }
    return meaning.nativeMeanings;
  }

  private buildDistractors(
    currentMeaning: MeaningWithWord,
    languageSetting: LanguageSetting,
    allMeanings: MeaningWithWord[],
    correctAnswer: string,
  ): string[] {
    const pool = allMeanings
      .filter((m) => m.id !== currentMeaning.id)
      .map((m) => this.buildAnswer(m, languageSetting))
      .filter((answer) => answer !== correctAnswer);

    const unique = [...new Set(pool)];
    return shuffle(unique).slice(0, 3);
  }
}
