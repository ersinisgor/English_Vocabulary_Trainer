import { Test, TestingModule } from '@nestjs/testing';
import { WordListsService } from './word-lists.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const prismaMock = {
  wordList: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  folder: { findFirst: jest.fn() },
  word: { count: jest.fn() },
  wordListItem: { createMany: jest.fn(), deleteMany: jest.fn() },
};

const userId = 'user-1';
const listId = 'list-1';

describe('WordListsService', () => {
  let service: WordListsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WordListsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(WordListsService);
    jest.clearAllMocks();
  });

  it('rejects creating a list inside a folder the user does not own', async () => {
    prismaMock.folder.findFirst.mockResolvedValue(null);
    await expect(
      service.create(userId, { name: 'L', folderId: 'nope' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects adding words that are not all owned by the user', async () => {
    prismaMock.wordList.findFirst.mockResolvedValue({ id: listId, userId });
    prismaMock.word.count.mockResolvedValue(1); // only 1 of 2 owned

    await expect(
      service.addWords(userId, listId, { wordIds: ['w1', 'w2'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaMock.wordListItem.createMany).not.toHaveBeenCalled();
  });

  it('adds owned words, skipping duplicates', async () => {
    prismaMock.wordList.findFirst
      .mockResolvedValueOnce({ id: listId, userId }) // findListOrThrow
      .mockResolvedValueOnce({
        id: listId,
        userId,
        items: [],
      }); // findOne returns a fresh list (with include)
    prismaMock.word.count.mockResolvedValue(2);
    prismaMock.wordListItem.createMany.mockResolvedValue({ count: 2 });
    // findOne uses findFirst with include; reuse the mock above
    prismaMock.wordList.findFirst.mockResolvedValue({
      id: listId,
      userId,
      items: [],
    });

    await service.addWords(userId, listId, { wordIds: ['w1', 'w2'] });

    expect(prismaMock.wordListItem.createMany).toHaveBeenCalledWith({
      data: [
        { wordListId: listId, wordId: 'w1' },
        { wordListId: listId, wordId: 'w2' },
      ],
      skipDuplicates: true,
    });
  });
});
