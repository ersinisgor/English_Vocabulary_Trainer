import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export interface TagSummary {
  id: string;
  name: string;
}

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns the distinct tags used across the authenticated user's meanings. */
  async findAllForUser(userId: string): Promise<TagSummary[]> {
    const tags = await this.prisma.tag.findMany({
      where: { meanings: { some: { meaning: { word: { userId } } } } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return tags;
  }
}
