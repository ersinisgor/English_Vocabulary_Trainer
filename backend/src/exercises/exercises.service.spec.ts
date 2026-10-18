import { Test, TestingModule } from '@nestjs/testing';
import { ExercisesService } from './exercises.service';
import { QuestionGeneratorService } from './question-generator.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ExerciseType,
  LanguageSetting,
  SessionStatus,
  PartOfSpeech,
  WordLevel,
} from 'generated/prisma';

const prismaMock = {
  wordMeaning: { findMany: jest.fn() },
  wordList: { findMany: jest.fn() },
  exerciseSettingsPreset: { findFirst: jest.fn() },
  exerciseSession: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  sessionQuestion: { update: jest.fn() },
  userMeaningState: { upsert: jest.fn() },
  $transaction: jest.fn(),
};

const userId = 'user-1';
const sessionId = 'session-1';
const questionId = 'question-1';
const meaningId = 'meaning-1';

const makeMeaning = (id = meaningId) => ({
  id,
  wordId: 'word-1',
  meaningOrder: 1,
  nativeMeanings: 'koşmak',
  englishDefinition: 'to run',
  createdAt: new Date(),
  word: {
    id: 'word-1',
    word: 'run',
    level: WordLevel.A1,
    partOfSpeech: PartOfSpeech.VERB,
    pronunciation: null,
    wordFamily: null,
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  splittedNativeMeanings: [],
  examples: [],
});

const makeQuestion = (
  overrides: Partial<{
    isAnswered: boolean;
    id: string;
    correctAnswer: string;
  }> = {},
) => ({
  id: overrides.id ?? questionId,
  sessionId,
  meaningId,
  questionOrder: 0,
  questionText: 'run',
  correctAnswer: overrides.correctAnswer ?? 'koşmak',
  options: [],
  prompt: null,
  isAnswered: overrides.isAnswered ?? false,
  isCorrect: null,
  userAnswer: null,
  answeredAt: null,
});

const makeSession = (
  overrides: Partial<{
    status: SessionStatus;
    answeredCount: number;
    exerciseType: ExerciseType;
    question: ReturnType<typeof makeQuestion>;
  }> = {},
) => ({
  id: sessionId,
  userId,
  exerciseType: overrides.exerciseType ?? ExerciseType.FLASH_CARD,
  languageSetting: LanguageSetting.ENGLISH_NATIVE,
  status: overrides.status ?? SessionStatus.IN_PROGRESS,
  totalQuestions: 1,
  answeredCount: overrides.answeredCount ?? 0,
  correctCount: 0,
  wrongCount: 0,
  startedAt: new Date(),
  completedAt: null,
  questions: [overrides.question ?? makeQuestion()],
});

describe('ExercisesService', () => {
  let service: ExercisesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExercisesService,
        QuestionGeneratorService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(ExercisesService);
    jest.clearAllMocks();
  });

  describe('startSession', () => {
    it('throws BadRequestException when no meanings exist', async () => {
      prismaMock.wordMeaning.findMany.mockResolvedValue([]);
      await expect(
        service.startSession(userId, {
          exerciseType: ExerciseType.FLASH_CARD,
          languageSetting: LanguageSetting.ENGLISH_NATIVE,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException for MULTIPLE_CHOICE with < 4 meanings', async () => {
      prismaMock.wordMeaning.findMany.mockResolvedValue([makeMeaning()]);
      await expect(
        service.startSession(userId, {
          exerciseType: ExerciseType.MULTIPLE_CHOICE,
          languageSetting: LanguageSetting.ENGLISH_NATIVE,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates session successfully for Flash Card', async () => {
      const meanings = [makeMeaning()];
      const session = makeSession();
      prismaMock.wordMeaning.findMany.mockResolvedValue(meanings);
      prismaMock.exerciseSession.create.mockResolvedValue(session);

      const result = await service.startSession(userId, {
        exerciseType: ExerciseType.FLASH_CARD,
        languageSetting: LanguageSetting.ENGLISH_NATIVE,
      });

      expect(result).toEqual(session);
      expect(prismaMock.exerciseSession.create).toHaveBeenCalled();
    });

    // The ids of the questions that were persisted, in presentation order.
    const persistedMeaningOrder = () =>
      prismaMock.exerciseSession.create.mock.calls[0][0].data.questions.create.map(
        (q: { meaningId: string }) => q.meaningId,
      );

    // A meaning with a custom id and word creation time (controls list order).
    const makeDated = (id: string, word: string, created: Date) => ({
      ...makeMeaning(id),
      word: { ...makeMeaning(id).word, word, createdAt: created },
    });

    it('presents questions in list order (by word add date) when wordOrder=LIST', async () => {
      // Pool given out of order; expected order is by createdAt asc.
      prismaMock.wordMeaning.findMany.mockResolvedValue([
        makeDated('m-late', 'cherry', new Date('2020-01-03')),
        makeDated('m-early', 'apple', new Date('2020-01-01')),
        makeDated('m-mid', 'banana', new Date('2020-01-02')),
      ]);
      prismaMock.exerciseSession.create.mockResolvedValue(makeSession());

      await service.startSession(userId, {
        exerciseType: ExerciseType.FLASH_CARD,
        languageSetting: LanguageSetting.ENGLISH_NATIVE,
        wordOrder: 'LIST' as never,
      });

      expect(persistedMeaningOrder()).toEqual(['m-early', 'm-mid', 'm-late']);
    });

    it('honors wordOrder=LIST coming from a preset', async () => {
      prismaMock.exerciseSettingsPreset.findFirst.mockResolvedValue({
        id: 'preset-1',
        wordOrder: 'LIST',
        folderIds: [],
        wordListIds: [],
        levels: [],
        partsOfSpeech: [],
        onlyStarred: false,
        onlyKeepLearning: false,
        excludeLearned: false,
        tagIds: [],
      });
      prismaMock.wordMeaning.findMany.mockResolvedValue([
        makeDated('m-b', 'banana', new Date('2020-01-02')),
        makeDated('m-a', 'apple', new Date('2020-01-01')),
      ]);
      prismaMock.exerciseSession.create.mockResolvedValue(makeSession());

      await service.startSession(userId, {
        exerciseType: ExerciseType.FLASH_CARD,
        languageSetting: LanguageSetting.ENGLISH_NATIVE,
        presetId: 'preset-1',
      });

      expect(persistedMeaningOrder()).toEqual(['m-a', 'm-b']);
    });

    // Count how many times each meaningId was persisted as a question.
    const persistedCounts = (): Record<string, number> => {
      const counts: Record<string, number> = {};
      for (const id of persistedMeaningOrder() as string[]) {
        counts[id] = (counts[id] ?? 0) + 1;
      }
      return counts;
    };

    it('asks floor(N/5) extra words a second time when askMoreThanOnce=ON', async () => {
      const pool = Array.from({ length: 10 }, (_, i) => makeMeaning(`m-${i}`));
      prismaMock.wordMeaning.findMany.mockResolvedValue(pool);
      prismaMock.exerciseSession.create.mockResolvedValue(makeSession());

      await service.startSession(userId, {
        exerciseType: ExerciseType.FLASH_CARD,
        languageSetting: LanguageSetting.ENGLISH_NATIVE,
        questionCount: 10,
        askMoreThanOnce: true,
      });

      const counts = persistedCounts();
      const ids = persistedMeaningOrder();
      // 10 selected + floor(10/5)=2 extras = 12 questions, 2 ids repeated twice.
      expect(ids).toHaveLength(12);
      expect(Object.values(counts).filter((c) => c === 2)).toHaveLength(2);
    });

    it('does not add extras when askMoreThanOnce=OFF', async () => {
      const pool = Array.from({ length: 10 }, (_, i) => makeMeaning(`m-${i}`));
      prismaMock.wordMeaning.findMany.mockResolvedValue(pool);
      prismaMock.exerciseSession.create.mockResolvedValue(makeSession());

      await service.startSession(userId, {
        exerciseType: ExerciseType.FLASH_CARD,
        languageSetting: LanguageSetting.ENGLISH_NATIVE,
        questionCount: 10,
      });

      expect(persistedMeaningOrder()).toHaveLength(10);
    });

    it('adds no extras when fewer than 5 words are selected', async () => {
      const pool = Array.from({ length: 4 }, (_, i) => makeMeaning(`m-${i}`));
      prismaMock.wordMeaning.findMany.mockResolvedValue(pool);
      prismaMock.exerciseSession.create.mockResolvedValue(makeSession());

      await service.startSession(userId, {
        exerciseType: ExerciseType.FLASH_CARD,
        languageSetting: LanguageSetting.ENGLISH_NATIVE,
        questionCount: 10,
        askMoreThanOnce: true,
      });

      expect(persistedMeaningOrder()).toHaveLength(4);
    });

    it('resolves folderIds to word-list ids and scopes the meaning query', async () => {
      prismaMock.wordList.findMany.mockResolvedValue([{ id: 'list-9' }]);
      prismaMock.wordMeaning.findMany.mockResolvedValue([makeMeaning()]);
      prismaMock.exerciseSession.create.mockResolvedValue(makeSession());

      await service.startSession(userId, {
        exerciseType: ExerciseType.FLASH_CARD,
        languageSetting: LanguageSetting.ENGLISH_NATIVE,
        folderIds: ['folder-1'],
      });

      expect(prismaMock.wordList.findMany).toHaveBeenCalledWith({
        where: { userId, folderId: { in: ['folder-1'] } },
        select: { id: true },
      });

      const where = prismaMock.wordMeaning.findMany.mock.calls[0][0].where;
      expect(where.word.listItems).toEqual({
        some: { wordListId: { in: ['list-9'] } },
      });
    });

    it('loads a preset when presetId is provided', async () => {
      prismaMock.exerciseSettingsPreset.findFirst.mockResolvedValue({
        id: 'preset-1',
        questionCount: 5,
        numberOfOptions: 4,
        folderIds: [],
        wordListIds: [],
        levels: ['A1'],
        partsOfSpeech: [],
        onlyStarred: false,
        onlyKeepLearning: false,
        excludeLearned: false,
        tagIds: [],
      });
      prismaMock.wordMeaning.findMany.mockResolvedValue([makeMeaning()]);
      prismaMock.exerciseSession.create.mockResolvedValue(makeSession());

      await service.startSession(userId, {
        exerciseType: ExerciseType.FLASH_CARD,
        languageSetting: LanguageSetting.ENGLISH_NATIVE,
        presetId: 'preset-1',
      });

      expect(prismaMock.exerciseSettingsPreset.findFirst).toHaveBeenCalled();
      const where = prismaMock.wordMeaning.findMany.mock.calls[0][0].where;
      expect(where.word.level).toEqual({ in: ['A1'] });
    });

    it('filters out meanings without content for the chosen format (English Sentence)', async () => {
      const withExample = {
        ...makeMeaning('m-with'),
        examples: [{ sentence: 'I run fast', clozeTemplate: null, translation: null }],
      };
      const withoutExample = makeMeaning('m-without'); // examples: []

      prismaMock.wordMeaning.findMany.mockResolvedValue([
        withExample,
        withoutExample,
      ]);

      // MULTIPLE_CHOICE needs >= numberOfOptions matching meanings; only one
      // meaning has a usable sentence, so it should fail validation.
      await expect(
        service.startSession(userId, {
          exerciseType: ExerciseType.MULTIPLE_CHOICE,
          languageSetting: LanguageSetting.ENGLISH_ENGLISH,
          questionFormat: 'ENGLISH_SENTENCE' as any,
          answerFormat: 'ENGLISH_WORD' as any,
          numberOfOptions: 4,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('submitAnswer', () => {
    it('throws NotFoundException when session not found', async () => {
      prismaMock.exerciseSession.findFirst.mockResolvedValue(null);
      await expect(
        service.submitAnswer(userId, sessionId, {
          questionId,
          answer: 'correct',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when session is completed', async () => {
      prismaMock.exerciseSession.findFirst.mockResolvedValue(
        makeSession({ status: SessionStatus.COMPLETED }),
      );
      await expect(
        service.submitAnswer(userId, sessionId, {
          questionId,
          answer: 'correct',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException when question not found in session', async () => {
      prismaMock.exerciseSession.findFirst.mockResolvedValue(makeSession());
      await expect(
        service.submitAnswer(userId, sessionId, {
          questionId: 'wrong-id',
          answer: 'correct',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when question already answered', async () => {
      const session = {
        ...makeSession(),
        questions: [makeQuestion({ isAnswered: true })],
      };
      prismaMock.exerciseSession.findFirst.mockResolvedValue(session);
      await expect(
        service.submitAnswer(userId, sessionId, {
          questionId,
          answer: 'correct',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('correctly evaluates FlashCard answer as correct', async () => {
      prismaMock.exerciseSession.findFirst.mockResolvedValue(makeSession());
      const updatedQuestion = {
        ...makeQuestion(),
        isAnswered: true,
        isCorrect: true,
      };
      const updatedSession = makeSession({
        answeredCount: 1,
        status: SessionStatus.COMPLETED,
      });
      prismaMock.$transaction.mockResolvedValue([
        updatedQuestion,
        null,
        updatedSession,
      ]);

      const result = await service.submitAnswer(userId, sessionId, {
        questionId,
        answer: 'correct',
      });

      expect(result.question.isCorrect).toBe(true);
    });

    it('correctly evaluates FlashCard answer as incorrect', async () => {
      prismaMock.exerciseSession.findFirst.mockResolvedValue(makeSession());
      const updatedQuestion = {
        ...makeQuestion(),
        isAnswered: true,
        isCorrect: false,
      };
      const updatedSession = makeSession({
        answeredCount: 1,
        status: SessionStatus.COMPLETED,
      });
      prismaMock.$transaction.mockResolvedValue([
        updatedQuestion,
        null,
        updatedSession,
      ]);

      const result = await service.submitAnswer(userId, sessionId, {
        questionId,
        answer: 'incorrect',
      });

      expect(result.question.isCorrect).toBe(false);
    });

    it('evaluates Writing answers case- and whitespace-insensitively', async () => {
      const question = makeQuestion({ correctAnswer: 'run' });
      prismaMock.exerciseSession.findFirst.mockResolvedValue(
        makeSession({ exerciseType: ExerciseType.WRITING, question }),
      );
      const updatedQuestion = {
        ...question,
        isAnswered: true,
        isCorrect: true,
      };
      prismaMock.$transaction.mockResolvedValue([
        updatedQuestion,
        null,
        makeSession({ answeredCount: 1, status: SessionStatus.COMPLETED }),
      ]);

      const result = await service.submitAnswer(userId, sessionId, {
        questionId,
        answer: '  Run ',
      });

      expect(result.question.isCorrect).toBe(true);
    });

    it('accepts a single-letter typo in a Writing answer as correct', async () => {
      const question = makeQuestion({ correctAnswer: 'beautiful' });
      prismaMock.exerciseSession.findFirst.mockResolvedValue(
        makeSession({ exerciseType: ExerciseType.WRITING, question }),
      );
      prismaMock.$transaction.mockResolvedValue([
        question,
        null,
        makeSession({ answeredCount: 1, status: SessionStatus.COMPLETED }),
      ]);

      await service.submitAnswer(userId, sessionId, {
        questionId,
        answer: 'beatiful', // one missing letter
      });

      expect(
        prismaMock.sessionQuestion.update.mock.calls[0][0].data.isCorrect,
      ).toBe(true);
    });

    it('accepts any native-meaning term for a Writing native-answer question', async () => {
      const question = {
        ...makeQuestion({ correctAnswer: 'saklanmış / gizlenmiş / gizli' }),
        options: ['saklanmış', 'gizlenmiş', 'gizli'],
      };
      prismaMock.exerciseSession.findFirst.mockResolvedValue({
        ...makeSession({ exerciseType: ExerciseType.WRITING }),
        questions: [question],
      });
      prismaMock.$transaction.mockResolvedValue([
        question,
        null,
        makeSession({ answeredCount: 1, status: SessionStatus.COMPLETED }),
      ]);

      // Typing just one of the slash-separated terms is correct.
      await service.submitAnswer(userId, sessionId, {
        questionId,
        answer: 'gizli',
      });

      expect(
        prismaMock.sessionQuestion.update.mock.calls[0][0].data.isCorrect,
      ).toBe(true);
    });

    it('rejects a term that matches none of the native-meaning options', async () => {
      const question = {
        ...makeQuestion({ correctAnswer: 'saklanmış / gizlenmiş / gizli' }),
        options: ['saklanmış', 'gizlenmiş', 'gizli'],
      };
      prismaMock.exerciseSession.findFirst.mockResolvedValue({
        ...makeSession({ exerciseType: ExerciseType.WRITING }),
        questions: [question],
      });
      prismaMock.$transaction.mockResolvedValue([
        question,
        null,
        makeSession({ answeredCount: 1, status: SessionStatus.COMPLETED }),
      ]);

      await service.submitAnswer(userId, sessionId, {
        questionId,
        answer: 'tamamen-alakasiz',
      });

      expect(
        prismaMock.sessionQuestion.update.mock.calls[0][0].data.isCorrect,
      ).toBe(false);
    });

    it('evaluates True/False answers against the boolean-string correctAnswer', async () => {
      const question = makeQuestion({ correctAnswer: 'true' });
      prismaMock.exerciseSession.findFirst.mockResolvedValue(
        makeSession({ exerciseType: ExerciseType.TRUE_FALSE, question }),
      );
      const updatedQuestion = {
        ...question,
        isAnswered: true,
        isCorrect: true,
      };
      prismaMock.$transaction.mockResolvedValue([
        updatedQuestion,
        null,
        makeSession({ answeredCount: 1, status: SessionStatus.COMPLETED }),
      ]);

      const result = await service.submitAnswer(userId, sessionId, {
        questionId,
        answer: 'true',
      });

      expect(result.question.isCorrect).toBe(true);
    });
  });

  describe('getResults', () => {
    it('throws BadRequestException when session is not completed', async () => {
      prismaMock.exerciseSession.findFirst.mockResolvedValue(makeSession());
      await expect(
        service.getResults(userId, sessionId),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns session when completed', async () => {
      const completed = makeSession({ status: SessionStatus.COMPLETED });
      prismaMock.exerciseSession.findFirst.mockResolvedValue(completed);
      const result = await service.getResults(userId, sessionId);
      expect(result.status).toBe(SessionStatus.COMPLETED);
    });
  });

  describe('startMatching', () => {
    // A meaning carrying ordered split native meanings.
    const makeMatchMeaning = (id: string, word: string, splits: string[]) => ({
      ...makeMeaning(id),
      word: { ...makeMeaning(id).word, word },
      splittedNativeMeanings: splits.map((meaningText, i) => ({
        id: `${id}-s${i}`,
        meaningId: id,
        meaningText,
        order: i + 1,
      })),
    });

    it('pairs the word with the FIRST split meaning (no slash list)', async () => {
      prismaMock.wordMeaning.findMany.mockResolvedValue([
        makeMatchMeaning('m1', 'give up', ['bırakmak', 'teslim olmak', 'pes etmek']),
        makeMatchMeaning('m2', 'run', ['koşmak']),
      ]);

      const res = await service.startMatching(userId, { pairCount: 2 });

      const giveUp = res.pairs.find((p) => p.first === 'give up');
      expect(giveUp?.second).toBe('bırakmak');
    });

    it('excludes meanings without a split meaning and throws when too few', async () => {
      prismaMock.wordMeaning.findMany.mockResolvedValue([
        makeMatchMeaning('m1', 'run', ['koşmak']),
        makeMatchMeaning('m2', 'eat', []), // no split → ineligible
      ]);

      await expect(
        service.startMatching(userId, { pairCount: 2 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('skips duplicate sides to avoid ambiguous matches', async () => {
      prismaMock.wordMeaning.findMany.mockResolvedValue([
        makeMatchMeaning('m1', 'run', ['koşmak']),
        makeMatchMeaning('m2', 'jog', ['koşmak']), // same native side → dropped
        makeMatchMeaning('m3', 'eat', ['yemek']),
      ]);

      const res = await service.startMatching(userId, { pairCount: 2 });

      const seconds = res.pairs.map((p) => p.second);
      expect(new Set(seconds).size).toBe(seconds.length);
    });
  });

  describe('hand-picked words', () => {
    const pool = (n: number) =>
      Array.from({ length: n }, (_, i) => makeMeaning(`m-${i}`));

    it('restricts the question pool to the given wordIds', async () => {
      prismaMock.wordMeaning.findMany.mockResolvedValue(pool(2));
      prismaMock.exerciseSession.create.mockResolvedValue(makeSession());

      await service.startSession(userId, {
        exerciseType: ExerciseType.FLASH_CARD,
        languageSetting: LanguageSetting.ENGLISH_NATIVE,
        wordIds: ['w-1', 'w-2'],
      });

      const where = prismaMock.wordMeaning.findMany.mock.calls[0][0].where;
      expect(where.word.id).toEqual({ in: ['w-1', 'w-2'] });
    });

    it('leaves a non-SAME distractor pool unrestricted', async () => {
      prismaMock.wordMeaning.findMany
        .mockResolvedValueOnce(pool(4))
        .mockResolvedValueOnce(pool(4));
      prismaMock.exerciseSession.create.mockResolvedValue(makeSession());

      await service.startSession(userId, {
        exerciseType: ExerciseType.MULTIPLE_CHOICE,
        languageSetting: LanguageSetting.ENGLISH_NATIVE,
        numberOfOptions: 4,
        wordIds: ['w-1', 'w-2'],
        wrongAnswerSource: 'ALL' as any,
      });

      // Distractors may come from outside the selection — otherwise a small
      // hand-picked set could never fill the options.
      expect(prismaMock.wordMeaning.findMany.mock.calls[1][0].where).toEqual({
        word: { userId },
      });
    });
  });

  describe('wrong answer source', () => {
    const pool = (prefix: string, n: number) =>
      Array.from({ length: n }, (_, i) => makeMeaning(`${prefix}-${i}`));
    const mcDto = (extra: Record<string, unknown>) => ({
      exerciseType: ExerciseType.MULTIPLE_CHOICE,
      languageSetting: LanguageSetting.ENGLISH_NATIVE,
      numberOfOptions: 4,
      ...extra,
    });

    it('SAME (default): reuses the question pool — no second query', async () => {
      prismaMock.wordMeaning.findMany.mockResolvedValue(pool('q', 4));
      prismaMock.exerciseSession.create.mockResolvedValue(makeSession());

      await service.startSession(userId, mcDto({}));

      expect(prismaMock.wordMeaning.findMany).toHaveBeenCalledTimes(1);
    });

    it('ALL: draws distractors from every word of the user', async () => {
      prismaMock.wordMeaning.findMany
        .mockResolvedValueOnce(pool('q', 4))
        .mockResolvedValueOnce(pool('d', 4));
      prismaMock.exerciseSession.create.mockResolvedValue(makeSession());

      await service.startSession(userId, mcDto({ wrongAnswerSource: 'ALL' }));

      expect(prismaMock.wordMeaning.findMany).toHaveBeenCalledTimes(2);
      expect(prismaMock.wordMeaning.findMany.mock.calls[1][0].where).toEqual({
        word: { userId },
      });
    });

    it('FOLDERS: draws distractors from the chosen folders/lists', async () => {
      prismaMock.wordList.findMany.mockResolvedValue([{ id: 'list-5' }]);
      prismaMock.wordMeaning.findMany
        .mockResolvedValueOnce(pool('q', 4))
        .mockResolvedValueOnce(pool('d', 4));
      prismaMock.exerciseSession.create.mockResolvedValue(makeSession());

      await service.startSession(
        userId,
        mcDto({ wrongAnswerSource: 'FOLDERS', wrongAnswerFolderIds: ['f-1'] }),
      );

      const where = prismaMock.wordMeaning.findMany.mock.calls[1][0].where;
      expect(where.word.listItems).toEqual({
        some: { wordListId: { in: ['list-5'] } },
      });
    });

    it('DATE_RANGE: filters distractors by word creation date', async () => {
      prismaMock.wordMeaning.findMany
        .mockResolvedValueOnce(pool('q', 4))
        .mockResolvedValueOnce(pool('d', 4));
      prismaMock.exerciseSession.create.mockResolvedValue(makeSession());

      await service.startSession(
        userId,
        mcDto({
          wrongAnswerSource: 'DATE_RANGE',
          wrongAnswerFrom: '2020-01-01T00:00:00.000Z',
          wrongAnswerTo: '2020-12-31T00:00:00.000Z',
        }),
      );

      const createdAt =
        prismaMock.wordMeaning.findMany.mock.calls[1][0].where.word.createdAt;
      expect(createdAt.gte).toEqual(new Date('2020-01-01T00:00:00.000Z'));
      expect(createdAt.lte).toEqual(new Date('2020-12-31T00:00:00.000Z'));
    });

    it('throws when the distractor source has too few words', async () => {
      prismaMock.wordMeaning.findMany
        .mockResolvedValueOnce(pool('q', 4))
        .mockResolvedValueOnce(pool('d', 1)); // 1 < numberOfOptions (4)

      await expect(
        service.startSession(userId, mcDto({ wrongAnswerSource: 'ALL' })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('time limit', () => {
    const pool = (n: number) =>
      Array.from({ length: n }, (_, i) => makeMeaning(`m-${i}`));

    it('passes timeLimitSeconds to the created session', async () => {
      prismaMock.wordMeaning.findMany.mockResolvedValue(pool(4));
      prismaMock.exerciseSession.create.mockResolvedValue(makeSession());

      await service.startSession(userId, {
        exerciseType: ExerciseType.FLASH_CARD,
        languageSetting: LanguageSetting.ENGLISH_NATIVE,
        timeLimitSeconds: 20,
      });

      expect(
        prismaMock.exerciseSession.create.mock.calls[0][0].data
          .timeLimitSeconds,
      ).toBe(20);
    });

    it('stores null when no time limit is given', async () => {
      prismaMock.wordMeaning.findMany.mockResolvedValue(pool(4));
      prismaMock.exerciseSession.create.mockResolvedValue(makeSession());

      await service.startSession(userId, {
        exerciseType: ExerciseType.FLASH_CARD,
        languageSetting: LanguageSetting.ENGLISH_NATIVE,
      });

      expect(
        prismaMock.exerciseSession.create.mock.calls[0][0].data
          .timeLimitSeconds,
      ).toBeNull();
    });

    it('defaults trackProgress to true; honors an explicit false', async () => {
      prismaMock.wordMeaning.findMany.mockResolvedValue(pool(4));
      prismaMock.exerciseSession.create.mockResolvedValue(makeSession());

      await service.startSession(userId, {
        exerciseType: ExerciseType.FLASH_CARD,
        languageSetting: LanguageSetting.ENGLISH_NATIVE,
      });
      expect(
        prismaMock.exerciseSession.create.mock.calls[0][0].data.trackProgress,
      ).toBe(true);

      jest.clearAllMocks();
      prismaMock.wordMeaning.findMany.mockResolvedValue(pool(4));
      prismaMock.exerciseSession.create.mockResolvedValue(makeSession());

      await service.startSession(userId, {
        exerciseType: ExerciseType.FLASH_CARD,
        languageSetting: LanguageSetting.ENGLISH_NATIVE,
        trackProgress: false,
      });
      expect(
        prismaMock.exerciseSession.create.mock.calls[0][0].data.trackProgress,
      ).toBe(false);
    });

    it('inherits timeLimitSeconds from a preset', async () => {
      prismaMock.exerciseSettingsPreset.findFirst.mockResolvedValue({
        id: 'preset-1',
        timeLimitSeconds: 15,
        testTypes: [],
        folderIds: [],
        wordListIds: [],
        levels: [],
        partsOfSpeech: [],
        onlyStarred: false,
        onlyKeepLearning: false,
        excludeLearned: false,
        tagIds: [],
      });
      prismaMock.wordMeaning.findMany.mockResolvedValue(pool(4));
      prismaMock.exerciseSession.create.mockResolvedValue(makeSession());

      await service.startSession(userId, {
        exerciseType: ExerciseType.FLASH_CARD,
        languageSetting: LanguageSetting.ENGLISH_NATIVE,
        presetId: 'preset-1',
      });

      expect(
        prismaMock.exerciseSession.create.mock.calls[0][0].data
          .timeLimitSeconds,
      ).toBe(15);
    });
  });

  describe('test (mixed) mode', () => {
    const pool = (n: number) =>
      Array.from({ length: n }, (_, i) => makeMeaning(`m-${i}`));

    it('assigns each question a concrete type from the chosen test types', async () => {
      prismaMock.wordMeaning.findMany.mockResolvedValue(pool(6));
      prismaMock.exerciseSession.create.mockResolvedValue(makeSession());

      await service.startSession(userId, {
        exerciseType: ExerciseType.TEST,
        languageSetting: LanguageSetting.ENGLISH_NATIVE,
        numberOfOptions: 4,
        testTypes: [ExerciseType.MULTIPLE_CHOICE, ExerciseType.WRITING],
      });

      const data = prismaMock.exerciseSession.create.mock.calls[0][0].data;
      expect(data.exerciseType).toBe(ExerciseType.TEST);
      const types = data.questions.create.map(
        (q: { exerciseType: ExerciseType }) => q.exerciseType,
      );
      expect(types.length).toBe(6);
      for (const ty of types) {
        expect([
          ExerciseType.MULTIPLE_CHOICE,
          ExerciseType.WRITING,
        ]).toContain(ty);
      }
    });

    it('evaluates a submitted answer by the per-question type', async () => {
      // A Test session whose question is a Writing question (normalized match).
      const writingQuestion = {
        ...makeQuestion({ correctAnswer: 'run' }),
        exerciseType: ExerciseType.WRITING,
      };
      const session = {
        ...makeSession({ exerciseType: ExerciseType.TEST }),
        questions: [writingQuestion],
      };
      prismaMock.exerciseSession.findFirst.mockResolvedValue(session);
      prismaMock.$transaction.mockResolvedValue([writingQuestion, null, session]);

      await service.submitAnswer(userId, sessionId, {
        questionId,
        answer: 'Run', // differs only by case → Writing normalizes to correct
      });

      expect(
        prismaMock.sessionQuestion.update.mock.calls[0][0].data.isCorrect,
      ).toBe(true);
    });
  });
});
