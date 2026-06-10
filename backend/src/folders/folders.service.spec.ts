import { Test, TestingModule } from '@nestjs/testing';
import { FoldersService } from './folders.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma';

const prismaMock = {
  folder: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const userId = 'user-1';

describe('FoldersService', () => {
  let service: FoldersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoldersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(FoldersService);
    jest.clearAllMocks();
  });

  it('creates a folder with a trimmed name', async () => {
    prismaMock.folder.create.mockResolvedValue({ id: 'f1', name: 'Verbs' });
    await service.create(userId, { name: '  Verbs  ' });
    expect(prismaMock.folder.create).toHaveBeenCalledWith({
      data: { userId, name: 'Verbs' },
    });
  });

  it('maps a unique-constraint violation to ConflictException', async () => {
    prismaMock.folder.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'x',
      }),
    );
    await expect(
      service.create(userId, { name: 'Verbs' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws NotFoundException when updating a missing folder', async () => {
    prismaMock.folder.findFirst.mockResolvedValue(null);
    await expect(
      service.update(userId, 'missing', { name: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
