import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateWordDTO } from './dtos/create-word.dto';
import { UpdateWordDTO } from './dtos/update-word.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Word } from 'generated/prisma';
import { normalizeWord } from 'src/common/utils/word.utils';
import { FindWordsQueryDTO } from './dtos/find-words.query.dto';
import { Prisma } from 'generated/prisma';
import { WordPaginationResponse } from './types/word-pagination-result.type';

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

  async findAll(
    userId: string,
    query: FindWordsQueryDTO,
  ): Promise<WordPaginationResponse> {
    const { page = 1, limit = 20, level, partOfSpeech, search } = query;

    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(level && { level }),
      ...(partOfSpeech && { partOfSpeech }),
      ...(search && {
        word: {
          contains: search.toLowerCase(),
          mode: Prisma.QueryMode.insensitive,
        },
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.word.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.word.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
      },
    };
  }

  async findOne(userId: string, id: string): Promise<Word> {
    const word = await this.prisma.word.findFirst({
      where: { id, userId },
    });

    if (!word) {
      throw new NotFoundException('Word not found');
    }

    return word;
  }

  async update(userId: string, id: string, dto: UpdateWordDTO): Promise<Word> {
    const existing = await this.prisma.word.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Word not found');
    }

    // conflict logic stays (this is business logic, not auth)
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
      throw new NotFoundException('Word not found');
    }

    return this.prisma.word.delete({
      where: { id },
    });
  }
}
