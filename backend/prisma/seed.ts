/* eslint-disable @typescript-eslint/no-unsafe-assignment,
                  @typescript-eslint/no-unsafe-call,
                  @typescript-eslint/no-unsafe-member-access */

import type { PrismaClient as PrismaClientType } from '@prisma/client';
import { PrismaClient, Role } from '../generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma: PrismaClientType = new PrismaClient();

async function main(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminUsername || !adminPassword) {
    throw new Error('ADMIN_* environment variables are missing');
  }

  const adminCount = await prisma.user.count({
    where: { role: Role.ADMIN },
  });

  if (adminCount > 0) {
    console.log('ℹ️ Admin already exists. Skipping admin seed.');
    return;
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

  await prisma.user.create({
    data: {
      email: adminEmail,
      username: adminUsername,
      passwordHash,
      role: Role.ADMIN,
    },
  });

  console.log('✅ Initial admin user created successfully.');
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
