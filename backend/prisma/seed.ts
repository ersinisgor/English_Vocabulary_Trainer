/* eslint-disable @typescript-eslint/no-unsafe-assignment,
                  @typescript-eslint/no-unsafe-call,
                  @typescript-eslint/no-unsafe-member-access */

import type { PrismaClient as PrismaClientType } from '@prisma/client';
import { PrismaClient } from '../generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma: PrismaClientType = new PrismaClient();

async function main(): Promise<void> {
  const password = 'password123' as const;
  const saltRounds = 10 as const;

  const hash: string = await bcrypt.hash(password, saltRounds);

  await prisma.user.upsert({
    where: { email: 'you@example.com' },
    update: {},
    create: {
      email: 'you@example.com',
      username: 'you',
      passwordHash: hash,
    },
  });

  console.log('✅ Seed finished successfully.');
}

void main()
  .catch((error: unknown): never => {
    if (error instanceof Error) {
      console.error('❌ Seeding error:', error.message);
      console.error(error.stack ?? 'No stack trace.');
    } else {
      console.error('❌ Unknown error during seed:', String(error));
    }

    process.exit(1);
  })
  .finally(async (): Promise<void> => {
    try {
      await prisma.$disconnect();
    } catch (disconnectError: unknown) {
      if (disconnectError instanceof Error) {
        console.warn(
          '⚠️ Warning: Prisma disconnect failed:',
          disconnectError.message,
        );
      } else {
        console.warn('⚠️ Unknown disconnect error:', String(disconnectError));
      }
    }
  });
