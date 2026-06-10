import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, WordList } from 'generated/prisma';
import { CreateWordListDTO } from './dtos/create-word-list.dto';
import { UpdateWordListDTO } from './dtos/update-word-list.dto';
import { AddWordsDTO } from './dtos/add-words.dto';

type WordListWithItems = Prisma.WordListGetPayload<{
  include: { items: { include: { word: true } } };
}>;

@Injectable()
export class WordListsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateWordListDTO): Promise<WordList> {
    if (dto.folderId) {
      await this.verifyFolderOwnership(userId, dto.folderId);
    }

    try {
      return await this.prisma.wordList.create({
        data: {
          userId,
          name: dto.name.trim(),
          folderId: dto.folderId ?? null,
        },
      });
    } catch (error) {
      throw this.handleUniqueError(error, dto.name);
    }
  }

  async findAll(userId: string): Promise<WordList[]> {
    return this.prisma.wordList.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string): Promise<WordListWithItems> {
    const list = await this.prisma.wordList.findFirst({
      where: { id, userId },
      include: {
        items: {
          include: { word: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!list) {
      throw new NotFoundException('Word list not found');
    }

    return list;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateWordListDTO,
  ): Promise<WordList> {
    await this.findListOrThrow(userId, id);

    if (dto.folderId) {
      await this.verifyFolderOwnership(userId, dto.folderId);
    }

    try {
      return await this.prisma.wordList.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.folderId !== undefined && { folderId: dto.folderId }),
        },
      });
    } catch (error) {
      throw this.handleUniqueError(error, dto.name);
    }
  }

  async remove(userId: string, id: string): Promise<WordList> {
    await this.findListOrThrow(userId, id);
    return this.prisma.wordList.delete({ where: { id } });
  }

  async addWords(
    userId: string,
    id: string,
    dto: AddWordsDTO,
  ): Promise<WordListWithItems> {
    await this.findListOrThrow(userId, id);

    const ownedCount = await this.prisma.word.count({
      where: { id: { in: dto.wordIds }, userId },
    });

    if (ownedCount !== new Set(dto.wordIds).size) {
      throw new BadRequestException(
        'One or more words were not found or do not belong to you.',
      );
    }

    await this.prisma.wordListItem.createMany({
      data: dto.wordIds.map((wordId) => ({ wordListId: id, wordId })),
      skipDuplicates: true,
    });

    return this.findOne(userId, id);
  }

  async removeWord(
    userId: string,
    id: string,
    wordId: string,
  ): Promise<WordListWithItems> {
    await this.findListOrThrow(userId, id);

    await this.prisma.wordListItem.deleteMany({
      where: { wordListId: id, wordId },
    });

    return this.findOne(userId, id);
  }

  private async findListOrThrow(userId: string, id: string): Promise<WordList> {
    const list = await this.prisma.wordList.findFirst({
      where: { id, userId },
    });

    if (!list) {
      throw new NotFoundException('Word list not found');
    }

    return list;
  }

  private async verifyFolderOwnership(
    userId: string,
    folderId: string,
  ): Promise<void> {
    const folder = await this.prisma.folder.findFirst({
      where: { id: folderId, userId },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }
  }

  private handleUniqueError(error: unknown, name?: string): Error {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException(
        `A word list named "${name}" already exists.`,
      );
    }
    return error as Error;
  }
}
