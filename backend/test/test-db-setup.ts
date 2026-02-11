import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaClient } from '../generated/prisma';

const execAsync = promisify(exec);

export class TestDbSetup {
  private static prisma: PrismaClient;

  /**
   * Initialize test database - run migrations
   */
  static async setup(): Promise<void> {
    console.log('🔧 Setting up test database...');

    // Set environment to test
    process.env.NODE_ENV = 'test';

    try {
      // Push schema to test database
      console.log('📋 Pushing Prisma schema to test database...');
      await execAsync('npx prisma db push --skip-generate', {
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
        },
      });

      console.log('✅ Test database setup complete');
    } catch (error) {
      console.error('❌ Test database setup failed:', error);
      throw error;
    }
  }

  /**
   * Get Prisma client instance for tests
   */
  static getPrismaClient(): PrismaClient {
    if (!this.prisma) {
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });
    }
    return this.prisma;
  }

  /**
   * Clean all data from database between tests
   */
  static async cleanDatabase(): Promise<void> {
    const prisma = this.getPrismaClient();

    // Delete in correct order to respect foreign key constraints
    await prisma.$transaction([
      prisma.userSentence.deleteMany(),
      prisma.userWordState.deleteMany(),
      prisma.exampleSentence.deleteMany(),
      prisma.wordTag.deleteMany(),
      prisma.tag.deleteMany(),
      prisma.synonym.deleteMany(),
      prisma.antonym.deleteMany(),
      prisma.relatedWord.deleteMany(),
      prisma.wordMetadata.deleteMany(),
      prisma.splittedNativeMeaning.deleteMany(),
      prisma.wordMeaning.deleteMany(),
      prisma.word.deleteMany(),
      prisma.refreshToken.deleteMany(),
      prisma.user.deleteMany(),
    ]);
  }

  /**
   * Teardown - disconnect from database
   */
  static async teardown(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
  }

  /**
   * Reset database - clean and reseed if needed
   */
  static async reset(): Promise<void> {
    await this.cleanDatabase();
  }
}
