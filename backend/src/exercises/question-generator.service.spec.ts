import { Test, TestingModule } from '@nestjs/testing';
import { QuestionGeneratorService } from './question-generator.service';
import { ExerciseType, LanguageSetting, PartOfSpeech, WordLevel } from 'generated/prisma';

const makeMeaning = (overrides: Partial<{ id: string; nativeMeanings: string; englishDefinition: string | null }> = {}) => ({
  id: overrides.id ?? 'meaning-1',
  wordId: 'word-1',
  meaningOrder: 1,
  nativeMeanings: overrides.nativeMeanings ?? 'koşmak',
  englishDefinition: overrides.englishDefinition !== undefined ? overrides.englishDefinition : 'to move fast on foot',
  createdAt: new Date(),
  word: {
    id: 'word-1',
    word: 'run',
    level: WordLevel.A1,
    partOfSpeech: PartOfSpeech.VERB,
    pronunciation: null,
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  splittedNativeMeanings: [],
});

describe('QuestionGeneratorService', () => {
  let service: QuestionGeneratorService;

  const allMeanings = [
    makeMeaning({ id: 'meaning-1', nativeMeanings: 'koşmak' }),
    makeMeaning({ id: 'meaning-2', nativeMeanings: 'görmek' }),
    makeMeaning({ id: 'meaning-3', nativeMeanings: 'yemek' }),
    makeMeaning({ id: 'meaning-4', nativeMeanings: 'yazmak' }),
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuestionGeneratorService],
    }).compile();

    service = module.get(QuestionGeneratorService);
  });

  describe('Flash Card - ENGLISH_NATIVE', () => {
    it('returns questionText as word, correctAnswer as nativeMeanings, empty options', () => {
      const result = service.generateQuestion(
        allMeanings[0],
        ExerciseType.FLASH_CARD,
        LanguageSetting.ENGLISH_NATIVE,
        allMeanings,
      );

      expect(result.questionText).toBe('run');
      expect(result.correctAnswer).toBe('koşmak');
      expect(result.options).toEqual([]);
    });
  });

  describe('Flash Card - ENGLISH_ENGLISH', () => {
    it('uses englishDefinition as correctAnswer when available', () => {
      const result = service.generateQuestion(
        allMeanings[0],
        ExerciseType.FLASH_CARD,
        LanguageSetting.ENGLISH_ENGLISH,
        allMeanings,
      );

      expect(result.correctAnswer).toBe('to move fast on foot');
      expect(result.options).toEqual([]);
    });

    it('falls back to nativeMeanings when englishDefinition is null', () => {
      const meaningNoDefinition = makeMeaning({ id: 'meaning-1', englishDefinition: null });
      const result = service.generateQuestion(
        meaningNoDefinition,
        ExerciseType.FLASH_CARD,
        LanguageSetting.ENGLISH_ENGLISH,
        [meaningNoDefinition],
      );

      expect(result.correctAnswer).toBe('koşmak');
    });
  });

  describe('Multiple Choice - ENGLISH_NATIVE', () => {
    it('returns 4 options including the correct answer', () => {
      const result = service.generateQuestion(
        allMeanings[0],
        ExerciseType.MULTIPLE_CHOICE,
        LanguageSetting.ENGLISH_NATIVE,
        allMeanings,
      );

      expect(result.options).toHaveLength(4);
      expect(result.options).toContain('koşmak');
    });

    it('does not duplicate the correct answer in options', () => {
      const result = service.generateQuestion(
        allMeanings[0],
        ExerciseType.MULTIPLE_CHOICE,
        LanguageSetting.ENGLISH_NATIVE,
        allMeanings,
      );

      const correctAnswerCount = result.options.filter((o) => o === result.correctAnswer).length;
      expect(correctAnswerCount).toBe(1);
    });
  });
});
