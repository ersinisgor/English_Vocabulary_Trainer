import { Test, TestingModule } from '@nestjs/testing';
import { WordsService } from './words.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PartOfSpeech, WordLevel, Word } from 'generated/prisma';
import { CreateWordDTO } from './dtos/create-word.dto';
import { UpdateWordDTO } from './dtos/update-word.dto';

const prismaMock = {
  word: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('WordsService', () => {
  let service: WordsService;

  const userId = 'user-1';

  const wordEntity: Word = {
    id: 'word-1',
    word: 'test',
    level: WordLevel.A1,
    partOfSpeech: PartOfSpeech.NOUN,
    meaningOrder: 1,
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WordsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(WordsService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a word successfully', async () => {
      prismaMock.word.findUnique.mockResolvedValue(null);
      prismaMock.word.create.mockResolvedValue(wordEntity);

      const dto: CreateWordDTO = {
        word: 'Test',
        level: WordLevel.A1,
        partOfSpeech: PartOfSpeech.NOUN,
      };

      const result = await service.create(userId, dto);

      expect(result).toEqual(wordEntity);
      expect(prismaMock.word.create).toHaveBeenCalled();
    });

    it('throws ConflictException when duplicate exists', async () => {
      prismaMock.word.findUnique.mockResolvedValue(wordEntity);

      await expect(
        service.create(userId, {
          word: 'test',
          partOfSpeech: PartOfSpeech.NOUN,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findAll', () => {
    it('returns paginated words', async () => {
      prismaMock.$transaction.mockResolvedValue([[wordEntity], 1]);

      const result = await service.findAll(userId, {});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });
  });

  describe('findOne', () => {
    it('returns word by id', async () => {
      prismaMock.word.findFirst.mockResolvedValue(wordEntity);

      const result = await service.findOne(userId, wordEntity.id);

      expect(result).toEqual(wordEntity);
    });

    it('throws NotFoundException if not found', async () => {
      prismaMock.word.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(userId, 'missing-id'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates a word successfully', async () => {
      prismaMock.word.findFirst.mockResolvedValue(wordEntity);
      prismaMock.word.findUnique.mockResolvedValue(null);
      prismaMock.word.update.mockResolvedValue({
        ...wordEntity,
        word: 'updated',
      });

      const dto: UpdateWordDTO = { word: 'Updated' };

      const result = await service.update(userId, wordEntity.id, dto);

      expect(result.word).toBe('updated');
    });

    it('throws NotFoundException if word missing', async () => {
      prismaMock.word.findFirst.mockResolvedValue(null);

      await expect(
        service.update(userId, 'missing', {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException on duplicate update', async () => {
      prismaMock.word.findFirst.mockResolvedValue(wordEntity);
      prismaMock.word.findUnique.mockResolvedValue({
        ...wordEntity,
        id: 'other-id',
      });

      await expect(
        service.update(userId, wordEntity.id, {
          word: 'test',
          partOfSpeech: PartOfSpeech.NOUN,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('remove', () => {
    it('removes a word', async () => {
      prismaMock.word.findFirst.mockResolvedValue(wordEntity);
      prismaMock.word.delete.mockResolvedValue(wordEntity);

      const result = await service.remove(userId, wordEntity.id);

      expect(result.id).toBe(wordEntity.id);
    });

    it('throws NotFoundException if missing', async () => {
      prismaMock.word.findFirst.mockResolvedValue(null);

      await expect(service.remove(userId, 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
