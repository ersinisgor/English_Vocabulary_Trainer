import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { TestDbSetup } from './test-db-setup';
import { createTestUser, loginTestUser } from './test-helpers';
import { PartOfSpeech, WordLevel } from '../generated/prisma';
import { Server } from 'http';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';

interface WordResponse {
  id: string;
  word: string;
  level: WordLevel | null;
}

describe('Words E2E', () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof TestDbSetup.getPrismaClient>;
  let accessToken: string;
  let httpServer: Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    const reflector = app.get(Reflector);
    app.useGlobalGuards(new JwtAuthGuard(reflector));
    app.setGlobalPrefix('api/v1');
    await app.init();


    httpServer = app.getHttpServer() as Server;
    prisma = TestDbSetup.getPrismaClient();
  });

  beforeEach(async () => {
    await TestDbSetup.cleanDatabase();
    const user = await createTestUser(prisma);
    accessToken = (await loginTestUser(app, user.email, user.password)).tokens
      .accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /words', async () => {
    const res = await request(httpServer)
      .post('/api/v1/words')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        word: 'Example',
        partOfSpeech: PartOfSpeech.NOUN,
        level: WordLevel.A1,
      })
      .expect(201);

    const body = res.body as WordResponse;

    expect(body.word).toBe('example');
  });

  it('GET /words', async () => {
    await request(httpServer)
      .get('/api/v1/words')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('GET /words/:id', async () => {
    const word = await prisma.word.create({
      data: {
        word: 'test',
        partOfSpeech: PartOfSpeech.NOUN,
        userId: (await prisma.user.findFirst())!.id,
      },
    });

    const res = await request(httpServer)
      .get(`/api/v1/words/${word.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = res.body as WordResponse;

    expect(body.id).toBe(word.id);
  });

  it('PATCH /words/:id', async () => {
    const word = await prisma.word.create({
      data: {
        word: 'test',
        partOfSpeech: PartOfSpeech.NOUN,
        userId: (await prisma.user.findFirst())!.id,
      },
    });

    const res = await request(httpServer)
      .patch(`/api/v1/words/${word!.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ level: WordLevel.B1 })
      .expect(200);

    const body = res.body as WordResponse;

    expect(body.level).toBe(WordLevel.B1);
  });

  it('DELETE /words/:id', async () => {
    const word = await prisma.word.create({
      data: {
        word: 'test',
        partOfSpeech: PartOfSpeech.NOUN,
        userId: (await prisma.user.findFirst())!.id,
      },
    });

    await request(httpServer)
      .delete(`/api/v1/words/${word!.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });
});
