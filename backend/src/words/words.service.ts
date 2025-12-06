import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateWordDTO } from './dtos/create-word.dto';
import { UpdateWordDTO } from './dtos/update-word.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Word } from 'generated/prisma';

@Injectable()
export class WordsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createWordDTO: CreateWordDTO): Promise<Word> {
    const { word, level, partOfSpeech } = createWordDTO;
    return await this.prisma.word.create({
      data: {
        word,
        level,
        partOfSpeech,
      },
    });
  }

  async findAll(): Promise<Word[]> {
    return this.prisma.word.findMany({
      where: { isDeleted: false },
    });
  }

  async findOne(id: string): Promise<Word> {
    const word = await this.prisma.word.findFirst({
      where: { id, isDeleted: false },
    });

    if (!word) {
      throw new NotFoundException(`Word with id ${id} not found`);
    }

    return word;
  }

  update(id: number, updateWordDTO: UpdateWordDTO) {
    return `This action updates a #${id} word`;
  }

  remove(id: number) {
    return `This action removes a #${id} word`;
  }
}
