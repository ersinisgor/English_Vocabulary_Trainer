import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Folder, Prisma } from 'generated/prisma';
import { CreateFolderDTO } from './dtos/create-folder.dto';
import { UpdateFolderDTO } from './dtos/update-folder.dto';

@Injectable()
export class FoldersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateFolderDTO): Promise<Folder> {
    try {
      return await this.prisma.folder.create({
        data: { userId, name: dto.name.trim() },
      });
    } catch (error) {
      throw this.handleUniqueError(error, dto.name);
    }
  }

  async findAll(userId: string): Promise<Folder[]> {
    return this.prisma.folder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string): Promise<Folder> {
    return this.findFolderOrThrow(userId, id);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateFolderDTO,
  ): Promise<Folder> {
    await this.findFolderOrThrow(userId, id);

    try {
      return await this.prisma.folder.update({
        where: { id },
        data: { ...(dto.name !== undefined && { name: dto.name.trim() }) },
      });
    } catch (error) {
      throw this.handleUniqueError(error, dto.name);
    }
  }

  async remove(userId: string, id: string): Promise<Folder> {
    await this.findFolderOrThrow(userId, id);
    return this.prisma.folder.delete({ where: { id } });
  }

  private async findFolderOrThrow(userId: string, id: string): Promise<Folder> {
    const folder = await this.prisma.folder.findFirst({
      where: { id, userId },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    return folder;
  }

  private handleUniqueError(error: unknown, name?: string): Error {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException(`A folder named "${name}" already exists.`);
    }
    return error as Error;
  }
}
