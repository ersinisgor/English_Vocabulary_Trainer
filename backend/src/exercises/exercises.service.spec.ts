import { Test, TestingModule } from '@nestjs/testing';
import { ExercisesService } from './exercises.service';
import { QuestionGeneratorService } from './question-generator.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ExerciseType,
  LanguageSetting,
  SessionStatus,
  PartOfSpeech,
  WordLevel,
} from 'generated/prisma';

const prismaMock = {
  wordMeaning: { findMany: jest.fn() },
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
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  splittedNativeMeanings: [],
});

const makeQuestion = (overrides: Partial<{ isAnswered: boolean; id: string }> = {}) => ({
  id: overrides.id ?? questionId,
  sessionId,
  meaningId,
  questionOrder: 0,
  questionText: 'run',
  correctAnswer: 'koşmak',
  options: [],
  isAnswered: overrides.isAnswered ?? false,
  isCorrect: null,
  userAnswer: null,
  answeredAt: null,
});

const makeSession = (overrides: Partial<{ status: SessionStatus; answeredCount: number }> = {}) => ({
  id: sessionId,
  userId,
  exerciseType: ExerciseType.FLASH_CARD,
  languageSetting: LanguageSetting.ENGLISH_NATIVE,
  status: overrides.status ?? SessionStatus.IN_PROGRESS,
  totalQuestions: 1,
  answeredCount: overrides.answeredCount ?? 0,
  correctCount: 0,
  wrongCount: 0,
  startedAt: new Date(),
  completedAt: null,
  questions: [makeQuestion()],
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
  });

  describe('submitAnswer', () => {
    it('throws NotFoundException when session not found', async () => {
      prismaMock.exerciseSession.findFirst.mockResolvedValue(null);
      await expect(
        service.submitAnswer(userId, sessionId, { questionId, answer: 'correct' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when session is completed', async () => {
      prismaMock.exerciseSession.findFirst.mockResolvedValue(
        makeSession({ status: SessionStatus.COMPLETED }),
      );
      await expect(
        service.submitAnswer(userId, sessionId, { questionId, answer: 'correct' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException when question not found in session', async () => {
      prismaMock.exerciseSession.findFirst.mockResolvedValue(makeSession());
      await expect(
        service.submitAnswer(userId, sessionId, { questionId: 'wrong-id', answer: 'correct' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when question already answered', async () => {
      const session = {
        ...makeSession(),
        questions: [makeQuestion({ isAnswered: true })],
      };
      prismaMock.exerciseSession.findFirst.mockResolvedValue(session);
      await expect(
        service.submitAnswer(userId, sessionId, { questionId, answer: 'correct' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('correctly evaluates FlashCard answer as correct', async () => {
      prismaMock.exerciseSession.findFirst.mockResolvedValue(makeSession());
      const updatedQuestion = { ...makeQuestion(), isAnswered: true, isCorrect: true };
      const updatedSession = makeSession({ answeredCount: 1, status: SessionStatus.COMPLETED });
      prismaMock.$transaction.mockResolvedValue([updatedQuestion, null, updatedSession]);

      const result = await service.submitAnswer(userId, sessionId, {
        questionId,
        answer: 'correct',
      });

      expect(result.question.isCorrect).toBe(true);
    });

    it('correctly evaluates FlashCard answer as incorrect', async () => {
      prismaMock.exerciseSession.findFirst.mockResolvedValue(makeSession());
      const updatedQuestion = { ...makeQuestion(), isAnswered: true, isCorrect: false };
      const updatedSession = makeSession({ answeredCount: 1, status: SessionStatus.COMPLETED });
      prismaMock.$transaction.mockResolvedValue([updatedQuestion, null, updatedSession]);

      const result = await service.submitAnswer(userId, sessionId, {
        questionId,
        answer: 'incorrect',
      });

      expect(result.question.isCorrect).toBe(false);
    });
  });

  describe('getResults', () => {
    it('throws BadRequestException when session is not completed', async () => {
      prismaMock.exerciseSession.findFirst.mockResolvedValue(makeSession());
      await expect(service.getResults(userId, sessionId)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns session when completed', async () => {
      const completed = makeSession({ status: SessionStatus.COMPLETED });
      prismaMock.exerciseSession.findFirst.mockResolvedValue(completed);
      const result = await service.getResults(userId, sessionId);
      expect(result.status).toBe(SessionStatus.COMPLETED);
    });
  });
});
