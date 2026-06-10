import { Test, TestingModule } from '@nestjs/testing';
import { ExerciseSettingsService } from './exercise-settings.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { ExerciseType, LanguageSetting } from 'generated/prisma';

const prismaMock = {
  exerciseSettingsPreset: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const userId = 'user-1';

describe('ExerciseSettingsService', () => {
  let service: ExerciseSettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExerciseSettingsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(ExerciseSettingsService);
    jest.clearAllMocks();
  });

  it('creates a preset scoped to the user with a trimmed name', async () => {
    prismaMock.exerciseSettingsPreset.create.mockResolvedValue({ id: 'p1' });
    await service.create(userId, {
      name: '  Hard B2  ',
      exerciseType: ExerciseType.MULTIPLE_CHOICE,
      languageSetting: LanguageSetting.ENGLISH_NATIVE,
    });
    expect(prismaMock.exerciseSettingsPreset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId, name: 'Hard B2' }),
    });
  });

  it('throws NotFoundException when a preset is not owned by the user', async () => {
    prismaMock.exerciseSettingsPreset.findFirst.mockResolvedValue(null);
    await expect(service.findOne(userId, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
