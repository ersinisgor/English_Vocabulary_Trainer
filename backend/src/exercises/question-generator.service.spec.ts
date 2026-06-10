import { Test, TestingModule } from '@nestjs/testing';
import { QuestionGeneratorService } from './question-generator.service';
import {
  ContentFormat,
  ExerciseType,
  LanguageSetting,
  PartOfSpeech,
  WordLevel,
} from 'generated/prisma';

const makeMeaning = (
  overrides: Partial<{
    id: string;
    word: string;
    nativeMeanings: string;
    englishDefinition: string | null;
    examples: any[];
  }> = {},
) => ({
  id: overrides.id ?? 'meaning-1',
  wordId: 'word-1',
  meaningOrder: 1,
  nativeMeanings: overrides.nativeMeanings ?? 'koşmak',
  englishDefinition:
    overrides.englishDefinition !== undefined
      ? overrides.englishDefinition
      : 'to move fast on foot',
  createdAt: new Date(),
  word: {
    id: 'word-1',
    word: overrides.word ?? 'run',
    level: WordLevel.A1,
    partOfSpeech: PartOfSpeech.VERB,
    pronunciation: null,
    wordFamily: null,
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  splittedNativeMeanings: [],
  examples: overrides.examples ?? [],
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
      // Part of speech travels separately (not glued to the word).
      expect(result.partOfSpeech).toBe('verb');
    });
  });

  describe('Flash Card - ENGLISH_ENGLISH', () => {
    it('shows the definition on the front and the word on the back', () => {
      const result = service.generateQuestion(
        allMeanings[0],
        ExerciseType.FLASH_CARD,
        LanguageSetting.ENGLISH_ENGLISH,
        allMeanings,
      );

      expect(result.questionText).toBe('to move fast on foot');
      expect(result.correctAnswer).toBe('run');
      expect(result.options).toEqual([]);
    });

    it('resolveContent returns null for a missing definition (filtered out upstream)', () => {
      const meaningNoDefinition = makeMeaning({
        id: 'meaning-1',
        englishDefinition: null,
      });

      expect(
        service.resolveContent(
          meaningNoDefinition,
          ContentFormat.ENGLISH_DEFINITION,
        ),
      ).toBeNull();
    });

    it('honors explicit formats (English Sentence cloze front, word back)', () => {
      const meaning = makeMeaning({
        id: 'meaning-1',
        word: 'run',
        examples: [
          { sentence: 'I run fast', clozeTemplate: null, translation: null },
        ],
      });

      const result = service.generateQuestion(
        meaning,
        ExerciseType.FLASH_CARD,
        LanguageSetting.ENGLISH_ENGLISH,
        [meaning],
        4,
        {
          questionFormat: ContentFormat.ENGLISH_SENTENCE_CLOZE,
          answerFormat: ContentFormat.ENGLISH_WORD,
          frontFormats: [ContentFormat.ENGLISH_SENTENCE_CLOZE],
          backFormats: [ContentFormat.ENGLISH_WORD],
        },
      );

      expect(result.questionText).toContain('_____');
      expect(result.correctAnswer).toBe('run');
      expect(result.front?.[0]?.format).toBe('ENGLISH_SENTENCE_CLOZE');
      expect(result.back?.[0]?.text).toBe('run');
    });

    it('builds multi-part faces: word front (+cloze) / native back (+full sentence, word family)', () => {
      const meaning = makeMeaning({
        id: 'meaning-1',
        word: 'notice',
        nativeMeanings: 'fark etmek',
        examples: [
          {
            sentence: 'I noticed the mistake.',
            clozeTemplate: 'I {{1}} the mistake.',
            translation: null,
          },
        ],
      });
      (meaning.word as any).wordFamily = 'notice, noticeable, noticeably';

      const result = service.generateQuestion(
        meaning,
        ExerciseType.FLASH_CARD,
        LanguageSetting.ENGLISH_NATIVE,
        [meaning],
        4,
        {
          questionFormat: ContentFormat.ENGLISH_WORD,
          answerFormat: ContentFormat.NATIVE_MEANING,
          frontFormats: [
            ContentFormat.ENGLISH_WORD,
            ContentFormat.ENGLISH_SENTENCE_CLOZE,
          ],
          backFormats: [
            ContentFormat.NATIVE_MEANING,
            ContentFormat.ENGLISH_SENTENCE,
            ContentFormat.WORD_FAMILY,
          ],
        },
      );

      // Front: word + cloze sentence (hidden word blanked)
      expect(result.front?.[0]).toEqual({
        format: 'ENGLISH_WORD',
        text: 'notice',
      });
      expect(result.front?.[1]?.format).toBe('ENGLISH_SENTENCE_CLOZE');
      expect(result.front?.[1]?.text).toContain('_____');

      // Back: native meaning + full sentence (not blanked) + word family
      expect(result.back?.[0]).toEqual({
        format: 'NATIVE_MEANING',
        text: 'fark etmek',
      });
      expect(result.back?.[1]?.text).toBe('I noticed the mistake.');
      expect(result.back?.[2]).toEqual({
        format: 'WORD_FAMILY',
        text: 'notice, noticeable, noticeably',
      });
    });
  });

  describe('Flash Card - random front (ENGLISH_NATIVE)', () => {
    it('always produces a resolvable card; only word↔meaning with no definition or examples', () => {
      // No definition, no examples → only ENGLISH_WORD↔NATIVE_MEANING is usable.
      const meaning = makeMeaning({
        id: 'meaning-1',
        word: 'run',
        nativeMeanings: 'koşmak',
        englishDefinition: null,
      });

      const result = service.generateQuestion(
        meaning,
        ExerciseType.FLASH_CARD,
        LanguageSetting.ENGLISH_NATIVE,
        [meaning],
        4,
        {
          questionFormat: ContentFormat.ENGLISH_WORD,
          answerFormat: ContentFormat.NATIVE_MEANING,
          frontFormats: [ContentFormat.ENGLISH_WORD],
          backFormats: [ContentFormat.NATIVE_MEANING],
          randomFront: true,
        },
      );

      const faces = [result.front?.[0]?.format, result.back?.[0]?.format].sort();
      expect(faces).toEqual(['ENGLISH_WORD', 'NATIVE_MEANING']);
      expect(result.front?.[0]?.text).toBeTruthy();
      expect(result.back?.[0]?.text).toBeTruthy();
      expect(result.options).toEqual([]);
    });

    it('only picks scenarios whose front and back both resolve for the meaning', () => {
      const meaning = makeMeaning({
        id: 'meaning-1',
        word: 'run',
        nativeMeanings: 'koşmak',
        examples: [
          {
            sentence: 'I run fast.',
            clozeTemplate: 'I {{1}} fast.',
            answers: ['run'],
            // No translation → NATIVE_SENTENCE scenarios are not eligible.
            translation: null,
          },
        ],
      });

      const chosenBacks = new Set<string | undefined>();
      for (let i = 0; i < 40; i++) {
        const result = service.generateQuestion(
          meaning,
          ExerciseType.FLASH_CARD,
          LanguageSetting.ENGLISH_NATIVE,
          [meaning],
          4,
          {
            questionFormat: ContentFormat.ENGLISH_WORD,
            answerFormat: ContentFormat.NATIVE_MEANING,
            frontFormats: [ContentFormat.ENGLISH_WORD],
            backFormats: [ContentFormat.NATIVE_MEANING],
            randomFront: true,
          },
        );
        // Every emitted face must be non-empty.
        expect(result.front?.[0]?.text).toBeTruthy();
        expect(result.back?.[0]?.text).toBeTruthy();
        chosenBacks.add(result.back?.[0]?.format);
      }

      // NATIVE_SENTENCE (back of the English-sentence front) is never chosen
      // because this meaning has no translation.
      expect(chosenBacks.has('NATIVE_SENTENCE')).toBe(false);
    });
  });

  describe('Flash Card - random front (ENGLISH_ENGLISH)', () => {
    it('only picks definition/cloze scenarios, always ending on the word', () => {
      const meaning = makeMeaning({
        id: 'meaning-1',
        word: 'run',
        englishDefinition: 'to move fast on foot',
        examples: [
          {
            sentence: 'I run fast.',
            clozeTemplate: 'I {{1}} fast.',
            answers: ['run'],
            translation: null,
          },
        ],
      });

      const fronts = new Set<string | undefined>();
      for (let i = 0; i < 40; i++) {
        const result = service.generateQuestion(
          meaning,
          ExerciseType.FLASH_CARD,
          LanguageSetting.ENGLISH_ENGLISH,
          [meaning],
          4,
          {
            questionFormat: ContentFormat.ENGLISH_DEFINITION,
            answerFormat: ContentFormat.ENGLISH_WORD,
            frontFormats: [ContentFormat.ENGLISH_DEFINITION],
            backFormats: [ContentFormat.ENGLISH_WORD],
            randomFront: true,
          },
        );
        // Every ENGLISH_ENGLISH scenario resolves to the word on the back.
        expect(result.back?.[0]).toEqual({
          format: 'ENGLISH_WORD',
          text: 'run',
        });
        expect(result.front?.[0]?.text).toBeTruthy();
        fronts.add(result.front?.[0]?.format);
      }

      // Only the two defined ENGLISH_ENGLISH fronts may appear.
      fronts.forEach((f) =>
        expect(['ENGLISH_DEFINITION', 'ENGLISH_SENTENCE_CLOZE']).toContain(f),
      );
    });

    it('shows the English definition under the cloze sentence on the front', () => {
      const meaning = makeMeaning({
        id: 'meaning-1',
        word: 'run',
        englishDefinition: 'to move fast on foot',
        // No definition-only scenario: force the cloze scenario by removing it.
        examples: [
          {
            sentence: 'I run fast.',
            clozeTemplate: 'I {{1}} fast.',
            answers: ['run'],
            translation: null,
          },
        ],
      });

      // Drive the cloze scenario directly via explicit multi-part front.
      const result = service.generateQuestion(
        meaning,
        ExerciseType.FLASH_CARD,
        LanguageSetting.ENGLISH_ENGLISH,
        [meaning],
        4,
        {
          questionFormat: ContentFormat.ENGLISH_SENTENCE_CLOZE,
          answerFormat: ContentFormat.ENGLISH_WORD,
          frontFormats: [
            ContentFormat.ENGLISH_SENTENCE_CLOZE,
            ContentFormat.ENGLISH_DEFINITION,
          ],
          backFormats: [ContentFormat.ENGLISH_WORD],
        },
      );

      expect(result.front?.[0]?.format).toBe('ENGLISH_SENTENCE_CLOZE');
      expect(result.front?.[0]?.text).toContain('_____');
      expect(result.front?.[1]).toEqual({
        format: 'ENGLISH_DEFINITION',
        text: 'to move fast on foot',
      });
      expect(result.back?.[0]?.text).toBe('run');
    });

    it('hasRandomScenario is false when no definition and no examples', () => {
      const meaning = makeMeaning({
        id: 'meaning-1',
        englishDefinition: null,
        examples: [],
      });

      expect(
        service.hasRandomScenario(meaning, LanguageSetting.ENGLISH_ENGLISH),
      ).toBe(false);
    });
  });

  describe('Flash Card - random language', () => {
    it('draws scenarios from both languages over many questions', () => {
      // A meaning rich enough to support scenarios in both languages.
      const meaning = makeMeaning({
        id: 'meaning-1',
        word: 'run',
        nativeMeanings: 'koşmak',
        englishDefinition: 'to move fast on foot',
        examples: [
          {
            sentence: 'I run fast.',
            clozeTemplate: 'I {{1}} fast.',
            answers: ['run'],
            translation: 'Hızlı koşarım.',
            translationTemplate: '{{1}}.',
            translationAnswers: ['Hızlı koşarım'],
          },
        ],
      });

      const seenFormats = new Set<string | undefined>();
      for (let i = 0; i < 80; i++) {
        const result = service.generateQuestion(
          meaning,
          ExerciseType.FLASH_CARD,
          LanguageSetting.ENGLISH_NATIVE,
          [meaning],
          4,
          { ...({} as any), randomLanguage: true },
        );
        expect(result.front?.[0]?.text).toBeTruthy();
        expect(result.back?.[0]?.text).toBeTruthy();
        seenFormats.add(result.front?.[0]?.format);
      }

      // ENGLISH_ENGLISH-only fronts (definition/cloze) AND ENGLISH_NATIVE-only
      // fronts (native meaning/sentence) should both appear.
      const hasEnglishEnglish =
        seenFormats.has('ENGLISH_DEFINITION') ||
        seenFormats.has('ENGLISH_SENTENCE_CLOZE');
      const hasEnglishNative =
        seenFormats.has('NATIVE_MEANING') ||
        seenFormats.has('NATIVE_SENTENCE_HIGHLIGHTED') ||
        seenFormats.has('NATIVE_SENTENCE') ||
        seenFormats.has('ENGLISH_WORD');
      expect(hasEnglishEnglish).toBe(true);
      expect(hasEnglishNative).toBe(true);
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

      const correctAnswerCount = result.options.filter(
        (o) => o === result.correctAnswer,
      ).length;
      expect(correctAnswerCount).toBe(1);
    });

    it('appends pos inline when the answer is the English word, and carries pos separately', () => {
      const meaning = makeMeaning({ id: 'meaning-1', word: 'run' });
      const result = service.generateQuestion(
        meaning,
        ExerciseType.MULTIPLE_CHOICE,
        LanguageSetting.ENGLISH_NATIVE,
        [meaning, ...allMeanings.slice(1)],
        4,
        {
          questionFormat: ContentFormat.NATIVE_MEANING,
          answerFormat: ContentFormat.ENGLISH_WORD,
          frontFormats: [ContentFormat.NATIVE_MEANING],
          backFormats: [ContentFormat.ENGLISH_WORD],
        },
      );

      expect(result.correctAnswer).toBe('run (verb)');
      expect(result.options).toContain('run (verb)');
      // Question is NATIVE_MEANING → still identifies the word, so pos is shown.
      expect(result.partOfSpeech).toBe('verb');
    });

    it('carries pos separately when the question is the English word or native meaning', () => {
      const result = service.generateQuestion(
        allMeanings[0],
        ExerciseType.MULTIPLE_CHOICE,
        LanguageSetting.ENGLISH_NATIVE,
        allMeanings,
      );

      // Default: question = ENGLISH_WORD, answer = NATIVE_MEANING.
      expect(result.correctAnswer).toBe('koşmak');
      expect(result.partOfSpeech).toBe('verb');
    });

    it('omits pos when the question is neither the word nor its native meaning', () => {
      const meaning = makeMeaning({
        id: 'meaning-1',
        examples: [
          {
            sentence: 'She woke up early.',
            clozeTemplate: 'She {{1}} early.',
            answers: ['woke up'],
            translation: null,
          },
        ],
      });

      const result = service.generateQuestion(
        meaning,
        ExerciseType.MULTIPLE_CHOICE,
        LanguageSetting.ENGLISH_NATIVE,
        [meaning, ...allMeanings.slice(1)],
        4,
        {
          questionFormat: ContentFormat.ENGLISH_SENTENCE_HIGHLIGHTED,
          answerFormat: ContentFormat.NATIVE_MEANING,
          frontFormats: [ContentFormat.ENGLISH_SENTENCE_HIGHLIGHTED],
          backFormats: [ContentFormat.NATIVE_MEANING],
        },
      );

      expect(result.partOfSpeech).toBeUndefined();
    });

    it('honors a custom numberOfOptions', () => {
      const result = service.generateQuestion(
        allMeanings[0],
        ExerciseType.MULTIPLE_CHOICE,
        LanguageSetting.ENGLISH_NATIVE,
        allMeanings,
        3,
      );

      expect(result.options).toHaveLength(3);
      expect(result.options).toContain('koşmak');
    });
  });

  describe('English Sentence Highlighted', () => {
    it('renders the full sentence with the hidden word(s) wrapped in ** markers', () => {
      const meaning = makeMeaning({
        id: 'meaning-1',
        word: 'wake up',
        examples: [
          {
            sentence: 'She woke up to the fact that she was wasting time.',
            clozeTemplate: 'She {{1}} to the fact that she was wasting time.',
            translation: null,
            answers: ['woke up'],
          },
        ],
      });

      expect(
        service.resolveContent(
          meaning,
          ContentFormat.ENGLISH_SENTENCE_HIGHLIGHTED,
        ),
      ).toBe('She **woke up** to the fact that she was wasting time.');
    });

    it('highlights the Turkish equivalent in the native sentence', () => {
      const meaning = makeMeaning({
        id: 'meaning-1',
        examples: [
          {
            sentence: 'She woke up to the fact.',
            clozeTemplate: 'She {{1}} to the fact.',
            answers: ['woke up'],
            translation: 'O, gerçeğin farkına vardı.',
            translationTemplate: 'O, gerçeğin {{1}}.',
            translationAnswers: ['farkına vardı'],
          },
        ],
      });

      expect(
        service.resolveContent(meaning, ContentFormat.NATIVE_SENTENCE_HIGHLIGHTED),
      ).toBe('O, gerçeğin **farkına vardı**.');
    });
  });

  describe('Separator formatting', () => {
    it('renders "/" separators with surrounding spaces for native meanings', () => {
      const meaning = makeMeaning({
        id: 'meaning-1',
        nativeMeanings: 'dikkat etmek/fark etmek/dikkatini çekmek',
      });

      const result = service.generateQuestion(
        meaning,
        ExerciseType.FLASH_CARD,
        LanguageSetting.ENGLISH_NATIVE,
        [meaning],
      );

      // Front = word, back = native meaning with spaced slashes
      expect(result.correctAnswer).toBe(
        'dikkat etmek / fark etmek / dikkatini çekmek',
      );
    });

    it('spaces slashes in word family too', () => {
      const meaning = makeMeaning({ id: 'meaning-1' });
      (meaning.word as any).wordFamily = 'notice/noticeable/noticeably';

      expect(
        service.resolveContent(meaning, ContentFormat.WORD_FAMILY),
      ).toBe('notice / noticeable / noticeably');
    });
  });

  describe('Writing', () => {
    it('asks the meaning and expects the word, no options', () => {
      const result = service.generateQuestion(
        allMeanings[0],
        ExerciseType.WRITING,
        LanguageSetting.ENGLISH_NATIVE,
        allMeanings,
      );

      expect(result.questionText).toBe('koşmak');
      expect(result.correctAnswer).toBe('run');
      expect(result.options).toEqual([]);
    });
  });

  describe('True / False', () => {
    it('sets a prompt and a boolean-string correctAnswer consistent with each other', () => {
      const result = service.generateQuestion(
        allMeanings[0],
        ExerciseType.TRUE_FALSE,
        LanguageSetting.ENGLISH_NATIVE,
        allMeanings,
      );

      expect(['true', 'false']).toContain(result.correctAnswer);
      expect(result.prompt).toBeDefined();
      const isActuallyCorrect = result.prompt === 'koşmak';
      expect(result.correctAnswer).toBe(isActuallyCorrect ? 'true' : 'false');
    });
  });

  describe('Find in Sentence', () => {
    it('blanks the word out of the example and expects the word back', () => {
      const meaning = makeMeaning({
        id: 'meaning-1',
        word: 'run',
        examples: [{ sentence: 'I run every morning', clozeTemplate: null }],
      });

      const result = service.generateQuestion(
        meaning,
        ExerciseType.FIND_IN_SENTENCE,
        LanguageSetting.ENGLISH_NATIVE,
        [meaning, ...allMeanings.slice(1)],
        4,
      );

      expect(result.questionText).toContain('_____');
      expect(result.questionText).not.toMatch(/\brun\b/);
      expect(result.correctAnswer).toBe('run');
      expect(result.options).toContain('run');
    });

    it('hasUsableExample is false when there are no examples', () => {
      expect(service.hasUsableExample(allMeanings[0])).toBe(false);
    });
  });

  describe('Matching', () => {
    it('builds a board where every question shares the same option set', () => {
      const results = service.generateMatchingQuestions(
        allMeanings,
        LanguageSetting.ENGLISH_NATIVE,
      );

      expect(results).toHaveLength(allMeanings.length);
      const optionSets = results.map((r) => [...r.options].sort().join(','));
      expect(new Set(optionSets).size).toBe(1);
      results.forEach((r) => expect(r.options).toContain(r.correctAnswer));
    });
  });
});
