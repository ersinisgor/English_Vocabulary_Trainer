import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserMeaningState } from 'generated/prisma';

@Injectable()
export class UserMeaningStateService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string): Promise<UserMeaningState[]> {
    return this.prisma.userMeaningState.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleStar(userId: string, meaningId: string): Promise<UserMeaningState> {
    await this.verifyMeaningOwnership(userId, meaningId);

    const existing = await this.prisma.userMeaningState.findUnique({
      where: { userId_meaningId: { userId, meaningId } },
    });

    return this.prisma.userMeaningState.upsert({
      where: { userId_meaningId: { userId, meaningId } },
      create: { userId, meaningId, isStarred: true },
      update: { isStarred: !existing?.isStarred },
    });
  }

  async toggleKeepLearning(userId: string, meaningId: string): Promise<UserMeaningState> {
    await this.verifyMeaningOwnership(userId, meaningId);

    const existing = await this.prisma.userMeaningState.findUnique({
      where: { userId_meaningId: { userId, meaningId } },
    });

    return this.prisma.userMeaningState.upsert({
      where: { userId_meaningId: { userId, meaningId } },
      create: { userId, meaningId, keepLearning: false },
      update: { keepLearning: existing ? !existing.keepLearning : false },
    });
  }

  private async verifyMeaningOwnership(userId: string, meaningId: string): Promise<void> {
    const meaning = await this.prisma.wordMeaning.findFirst({
      where: { id: meaningId, word: { userId } },
    });

    if (!meaning) {
      throw new NotFoundException('Meaning not found');
    }
  }
}
