import { Test, TestingModule } from '@nestjs/testing';
import { WordsController } from './words.controller';
import { WordsService } from './words.service';
import { PartOfSpeech, WordLevel, Word, Role, User } from 'generated/prisma';
import { AuthenticatedRequest } from 'src/auth/types/interfaces/authenticated-request.interface';
import { FindWordsQueryDTO } from './dtos/find-words.query.dto';
import { UpdateWordDTO } from './dtos/update-word.dto';
import { CreateWordDTO } from './dtos/create-word.dto';
import { WordPaginationResponse } from './types/word-pagination-result.type';

type WordsServiceMock = {
  create: jest.Mock;
  findAll: jest.Mock;
  findOne: jest.Mock;
  update: jest.Mock;
  remove: jest.Mock;
};

describe('WordsController', () => {
  let controller: WordsController;
  let service: WordsServiceMock;

  const mockWordsService: WordsServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockUser: User = {
    id: 'user-1',
    email: 'test@test.com',
    username: null,
    passwordHash: 'hashed',
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRequest: AuthenticatedRequest = {
    user: mockUser,
  } as AuthenticatedRequest;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WordsController],
      providers: [
        {
          provide: WordsService,
          useValue: mockWordsService,
        },
      ],
    }).compile();

    controller = module.get(WordsController);
    service = module.get(WordsService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a word', async () => {
      const dto: CreateWordDTO = {
        word: 'test',
        partOfSpeech: PartOfSpeech.NOUN,
        level: WordLevel.A1,
      };

      const word: Word = {
        id: 'word-1',
        word: 'test',
        partOfSpeech: PartOfSpeech.NOUN,
        level: WordLevel.A1,
        pronunciation: null,
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.create.mockResolvedValue(word);

      const result = await controller.create(mockRequest, dto);

      expect(result).toEqual(word);
      expect(service.create).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('findAll', () => {
    it('should return paginated words', async () => {
      const query: FindWordsQueryDTO = {};

      const response: WordPaginationResponse = {
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 20,
        },
      };

      service.findAll.mockResolvedValue(response);

      const result = await controller.findAll(mockRequest, query);

      expect(result).toEqual(response);
      expect(service.findAll).toHaveBeenCalledWith('user-1', query);
    });
  });

  describe('findOne', () => {
    it('should return a word by id', async () => {
      const word: Word = {
        id: 'word-1',
        word: 'test',
        partOfSpeech: PartOfSpeech.NOUN,
        level: null,
        pronunciation: null,
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.findOne.mockResolvedValue(word);

      const result = await controller.findOne(mockRequest, 'word-1');

      expect(result).toEqual(word);
      expect(service.findOne).toHaveBeenCalledWith('user-1', 'word-1');
    });
  });

  describe('update', () => {
    it('should update a word', async () => {
      const dto: UpdateWordDTO = {
        word: 'updated',
      };

      const updatedWord: Word = {
        id: 'word-1',
        word: 'updated',
        partOfSpeech: PartOfSpeech.NOUN,
        level: null,
        pronunciation: null,
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.update.mockResolvedValue(updatedWord);

      const result = await controller.update(mockRequest, 'word-1', dto);

      expect(result).toEqual(updatedWord);
      expect(service.update).toHaveBeenCalledWith('user-1', 'word-1', dto);
    });
  });

  describe('remove', () => {
    it('should delete a word', async () => {
      const word: Word = {
        id: 'word-1',
        word: 'test',
        partOfSpeech: PartOfSpeech.NOUN,
        level: null,
        pronunciation: null,
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.remove.mockResolvedValue(word);

      const result = await controller.remove(mockRequest, 'word-1');

      expect(result).toEqual(word);
      expect(service.remove).toHaveBeenCalledWith('user-1', 'word-1');
    });
  });
});
