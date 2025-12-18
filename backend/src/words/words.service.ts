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

@Injectable()
export class WordsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createWordDTO: CreateWordDTO): Promise<Word> {
    const normalizedWord = normalizeWord(createWordDTO.word);
    const { partOfSpeech, level } = createWordDTO;

    const existing = await this.prisma.word.findUnique({
      where: {
        word_partOfSpeech: {
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
      },
    });
  }

  async findAll(): Promise<Word[]> {
    return this.prisma.word.findMany();
  }

  async findOne(id: string): Promise<Word> {
    const word = await this.prisma.word.findUnique({ where: { id } });

    if (!word) {
      throw new NotFoundException(`Word with id ${id} not found`);
    }

    return word;
  }

  async update(id: string, dto: UpdateWordDTO): Promise<Word> {
    const existing = await this.prisma.word.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Word with id ${id} not found`);
    }

    const normalizedWord = dto.word ? normalizeWord(dto.word) : existing.word;

    const newPartOfSpeech = dto.partOfSpeech ?? existing.partOfSpeech;

    if (dto.word || dto.partOfSpeech) {
      const conflict = await this.prisma.word.findUnique({
        where: {
          word_partOfSpeech: {
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

  async remove(id: string): Promise<Word> {
    try {
      return await this.prisma.word.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`Word with id "${id}" not found.`);
    }
  }
}
