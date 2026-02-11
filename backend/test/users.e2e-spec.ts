import { Server } from 'http';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { TestDbSetup } from './test-db-setup';
import { createTestUser, loginTestUser } from './test-helpers';
import { Role } from '../generated/prisma';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';

let httpServer: Server;

interface UserResponse {
  id: string;
  email: string;
  username: string | null;
  role: Role | null;
}

type UserListResponse = UserResponse[];

describe('Users E2E', () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof TestDbSetup.getPrismaClient>;
  let adminToken: string;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    const reflector = app.get(Reflector);
    app.useGlobalGuards(new JwtAuthGuard(reflector));
    app.setGlobalPrefix('api/v1');
    await app.init();

    httpServer = app.getHttpServer() as Server;
    prisma = TestDbSetup.getPrismaClient();
  });

  beforeEach(async () => {
    await TestDbSetup.cleanDatabase();

    const admin = await createTestUser(prisma, { role: Role.ADMIN });
    const user = await createTestUser(prisma);

    userId = user.id;

    adminToken = (await loginTestUser(app, admin.email, admin.password)).tokens
      .accessToken;
    userToken = (await loginTestUser(app, user.email, user.password)).tokens
      .accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('ADMIN can get all users', async () => {
    const res = await request(httpServer)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = res.body as UserListResponse;

    expect(body.length).toBeGreaterThan(0);
  });

  it('USER cannot get all users', async () => {
    await request(httpServer)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('ADMIN can create user', async () => {
    const res = await request(httpServer)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'new@test.com',
        password: 'Password123',
      })
      .expect(201);

    const body = res.body as UserResponse;

    expect(body.email).toBe('new@test.com');
  });

  it('ADMIN can update user role', async () => {
    const res = await request(httpServer)
      .patch(`/api/v1/users/${userId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: Role.ADMIN })
      .expect(200);

    const body = res.body as UserResponse;

    expect(body.role).toBe(Role.ADMIN);
  });

  it('USER can update own profile', async () => {
    const res = await request(httpServer)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ username: 'updated' })
      .expect(200);

    const body = res.body as UserResponse;

    expect(body.username).toBe('updated');
  });

  it('USER cannot delete users', async () => {
    await request(httpServer)
      .delete(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('ADMIN can delete user', async () => {
    await request(httpServer)
      .delete(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const deleted = await prisma.user.findUnique({ where: { id: userId } });
    expect(deleted).toBeNull();
  });
});
