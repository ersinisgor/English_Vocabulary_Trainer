import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateWordDTO } from './dtos/create-word.dto';
import { UpdateWordDTO } from './dtos/update-word.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Word } from 'generated/prisma';

@Injectable()
export class WordsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createWordDTO: CreateWordDTO): Promise<Word> {
    const { word, partOfSpeech } = createWordDTO;

    const existing = await this.prisma.word.findUnique({
      where: {
        word_partOfSpeech: {
          word,
          partOfSpeech,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `The word "${word}" with partOfSpeech "${partOfSpeech}" already exists.`,
      );
    }

    return await this.prisma.word.create({
      data: createWordDTO,
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

    if (dto.word || dto.partOfSpeech) {
      const newWord = dto.word ?? existing.word;
      const newPOS = dto.partOfSpeech ?? existing.partOfSpeech;

      const conflict = await this.prisma.word.findUnique({
        where: {
          word_partOfSpeech: {
            word: newWord,
            partOfSpeech: newPOS,
          },
        },
      });

      if (conflict && conflict.id !== id) {
        throw new ConflictException(
          `Another word "${newWord}" with partOfSpeech "${newPOS}" already exists.`,
        );
      }
    }

    return this.prisma.word.update({
      where: { id },
      data: dto,
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
