import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ExerciseSettingsPreset } from 'generated/prisma';
import { CreatePresetDTO } from './dtos/create-preset.dto';
import { UpdatePresetDTO } from './dtos/update-preset.dto';

@Injectable()
export class ExerciseSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    dto: CreatePresetDTO,
  ): Promise<ExerciseSettingsPreset> {
    return this.prisma.exerciseSettingsPreset.create({
      data: { userId, ...this.normalize(dto) },
    });
  }

  async findAll(userId: string): Promise<ExerciseSettingsPreset[]> {
    return this.prisma.exerciseSettingsPreset.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string): Promise<ExerciseSettingsPreset> {
    return this.findPresetOrThrow(userId, id);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdatePresetDTO,
  ): Promise<ExerciseSettingsPreset> {
    await this.findPresetOrThrow(userId, id);

    return this.prisma.exerciseSettingsPreset.update({
      where: { id },
      data: this.normalize(dto),
    });
  }

  async remove(userId: string, id: string): Promise<ExerciseSettingsPreset> {
    await this.findPresetOrThrow(userId, id);
    return this.prisma.exerciseSettingsPreset.delete({ where: { id } });
  }

  private normalize<T extends { name?: string }>(dto: T): T {
    if (dto.name !== undefined) {
      return { ...dto, name: dto.name.trim() };
    }
    return dto;
  }

  private async findPresetOrThrow(
    userId: string,
    id: string,
  ): Promise<ExerciseSettingsPreset> {
    const preset = await this.prisma.exerciseSettingsPreset.findFirst({
      where: { id, userId },
    });

    if (!preset) {
      throw new NotFoundException('Exercise settings preset not found');
    }

    return preset;
  }
}
