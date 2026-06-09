import { Test, TestingModule } from '@nestjs/testing';
import { UserMeaningStateService } from './user-meaning-state.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { UserMeaningState } from 'generated/prisma';

const prismaMock = {
  userMeaningState: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  wordMeaning: {
    findFirst: jest.fn(),
  },
};

const userId = 'user-1';
const meaningId = 'meaning-1';

const stateEntity: UserMeaningState = {
  id: 'state-1',
  userId,
  meaningId,
  isStarred: false,
  keepLearning: true,
  correctCount: 0,
  wrongCount: 0,
  practiceCount: 0,
  streakCount: 0,
  repetition: 0,
  interval: 0,
  easeFactor: 2.5 as unknown as any,
  firstReviewAt: null,
  lastReviewedAt: null,
  nextReviewAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UserMeaningStateService', () => {
  let service: UserMeaningStateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserMeaningStateService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(UserMeaningStateService);
    jest.clearAllMocks();
  });

  describe('findAllForUser', () => {
    it('returns all meaning states for user', async () => {
      prismaMock.userMeaningState.findMany.mockResolvedValue([stateEntity]);
      const result = await service.findAllForUser(userId);
      expect(result).toEqual([stateEntity]);
      expect(prismaMock.userMeaningState.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('toggleStar', () => {
    it('throws NotFoundException when meaning does not belong to user', async () => {
      prismaMock.wordMeaning.findFirst.mockResolvedValue(null);
      await expect(service.toggleStar(userId, meaningId)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates state with isStarred=true when no state exists', async () => {
      prismaMock.wordMeaning.findFirst.mockResolvedValue({ id: meaningId });
      prismaMock.userMeaningState.findUnique.mockResolvedValue(null);
      prismaMock.userMeaningState.upsert.mockResolvedValue({ ...stateEntity, isStarred: true });

      const result = await service.toggleStar(userId, meaningId);

      expect(result.isStarred).toBe(true);
    });

    it('toggles isStarred from false to true', async () => {
      prismaMock.wordMeaning.findFirst.mockResolvedValue({ id: meaningId });
      prismaMock.userMeaningState.findUnique.mockResolvedValue(stateEntity);
      prismaMock.userMeaningState.upsert.mockResolvedValue({ ...stateEntity, isStarred: true });

      await service.toggleStar(userId, meaningId);

      expect(prismaMock.userMeaningState.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ isStarred: true }),
        }),
      );
    });

    it('toggles isStarred from true to false', async () => {
      prismaMock.wordMeaning.findFirst.mockResolvedValue({ id: meaningId });
      prismaMock.userMeaningState.findUnique.mockResolvedValue({ ...stateEntity, isStarred: true });
      prismaMock.userMeaningState.upsert.mockResolvedValue({ ...stateEntity, isStarred: false });

      await service.toggleStar(userId, meaningId);

      expect(prismaMock.userMeaningState.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ isStarred: false }),
        }),
      );
    });
  });

  describe('toggleKeepLearning', () => {
    it('throws NotFoundException when meaning does not belong to user', async () => {
      prismaMock.wordMeaning.findFirst.mockResolvedValue(null);
      await expect(service.toggleKeepLearning(userId, meaningId)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('toggles keepLearning from true to false', async () => {
      prismaMock.wordMeaning.findFirst.mockResolvedValue({ id: meaningId });
      prismaMock.userMeaningState.findUnique.mockResolvedValue(stateEntity);
      prismaMock.userMeaningState.upsert.mockResolvedValue({ ...stateEntity, keepLearning: false });

      await service.toggleKeepLearning(userId, meaningId);

      expect(prismaMock.userMeaningState.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ keepLearning: false }),
        }),
      );
    });
  });
});
