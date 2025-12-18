import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateWordDTO } from './dtos/create-word.dto';
import { UpdateWordDTO } from './dtos/update-word.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Word } from 'generated/prisma';
import { normalizeWord } from 'src/common/utils/word.utils';

@Injectable()
export class WordsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createWordDTO: CreateWordDTO): Promise<Word> {
    const normalizedWord = normalizeWord(createWordDTO.word);
    const { partOfSpeech, level } = createWordDTO;

    const existing = await this.prisma.word.findUnique({
      where: {
        user_word_partOfSpeech: {
          userId,
          word: normalizedWord,
          partOfSpeech,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `The word "${normalizedWord}" with partOfSpeech "${partOfSpeech}" already exists.`,
      );
    }

    return this.prisma.word.create({
      data: {
        word: normalizedWord,
        partOfSpeech,
        level,
        userId,
      },
    });
  }

  async findAll(userId: string): Promise<Word[]> {
    return this.prisma.word.findMany({
      where: { userId },
    });
  }

  async findOne(userId: string, id: string): Promise<Word> {
    const word = await this.prisma.word.findFirst({
      where: { id, userId },
    });

    if (!word) {
      throw new NotFoundException(`Word not found`);
    }

    if (word.userId !== userId && !isAdmin) {
      throw new ForbiddenException('You cannot update this word');
    }

    return word;
  }

  async update(userId: string, id: string, dto: UpdateWordDTO): Promise<Word> {
    const existing = await this.prisma.word.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException(`Word not found`);
    }

    if (existing.userId !== userId && !isAdmin) {
      throw new ForbiddenException('You cannot update this word');
    }

    const normalizedWord = dto.word ? normalizeWord(dto.word) : existing.word;

    const newPartOfSpeech = dto.partOfSpeech ?? existing.partOfSpeech;

    if (dto.word || dto.partOfSpeech) {
      const conflict = await this.prisma.word.findUnique({
        where: {
          user_word_partOfSpeech: {
            userId,
            word: normalizedWord,
            partOfSpeech: newPartOfSpeech,
          },
        },
      });

      if (conflict && conflict.id !== id) {
        throw new ConflictException(
          `Another word "${normalizedWord}" with partOfSpeech "${newPartOfSpeech}" already exists.`,
        );
      }
    }

    return this.prisma.word.update({
      where: { id },
      data: {
        ...dto,
        word: normalizedWord,
      },
    });
  }

  async remove(userId: string, id: string): Promise<Word> {
    const word = await this.prisma.word.findFirst({
      where: { id, userId },
    });

    if (!word) {
      throw new NotFoundException(`Word not found`);
    }

    if (word.userId !== userId && !isAdmin) {
      throw new ForbiddenException('You cannot update this word');
    }

    return this.prisma.word.delete({
      where: { id },
    });
  }
}
