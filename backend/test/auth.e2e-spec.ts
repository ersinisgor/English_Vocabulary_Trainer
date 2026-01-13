import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { TestDbSetup } from './test-db-setup';
import {
  createTestUser,
  loginTestUser,
  extractRefreshTokenFromCookie,
  createTamperedRefreshToken,
  wait,
  TestUser,
} from './test-helpers';
import { Role } from '../generated/prisma';
import * as bcrypt from 'bcrypt';

describe('Auth E2E Tests', () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof TestDbSetup.getPrismaClient>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply same middleware as main app
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    
    await app.init();

    prisma = TestDbSetup.getPrismaClient();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await TestDbSetup.cleanDatabase();
  });

  describe('POST /api/v1/auth/register', () => {
    const validRegisterData = {
      email: 'newuser@example.com',
      password: 'Password123!',
      username: 'newuser',
    };

    it('should register a new user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(validRegisterData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', validRegisterData.email);
      expect(response.body).toHaveProperty('username', validRegisterData.username);
      expect(response.body).toHaveProperty('role', Role.USER);
      expect(response.body).not.toHaveProperty('passwordHash');

      // Verify user in database
      const user = await prisma.user.findUnique({
        where: { email: validRegisterData.email },
      });
      expect(user).toBeTruthy();
      expect(user!.email).toBe(validRegisterData.email);
    });

    it('should return 409 when email already exists', async () => {
      await createTestUser(prisma, { email: validRegisterData.email });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(validRegisterData)
        .expect(409);

      expect(response.body).toHaveProperty('statusCode', 409);
      expect(response.body.message).toContain('already exists');
    });

    it('should validate email format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...validRegisterData,
          email: 'invalid-email',
        })
        .expect(400);
    });

    it('should validate password requirements', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...validRegisterData,
          password: '123', // Too short
        })
        .expect(400);
    });

    it('should require email field', async () => {
      const { email, ...dataWithoutEmail } = validRegisterData;
      
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(dataWithoutEmail)
        .expect(400);
    });

    it('should require password field', async () => {
      const { password, ...dataWithoutPassword } = validRegisterData;
      
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(dataWithoutPassword)
        .expect(400);
    });

    it('should allow registration without username', async () => {
      const { username, ...dataWithoutUsername } = validRegisterData;
      
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...dataWithoutUsername,
          email: 'another@example.com',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
    });

    it('should hash password before storing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(validRegisterData)
        .expect(201);

      const user = await prisma.user.findUnique({
        where: { email: validRegisterData.email },
      });

      expect(user!.passwordHash).not.toBe(validRegisterData.password);
      const isValidHash = await bcrypt.compare(
        validRegisterData.password,
        user!.passwordHash,
      );
      expect(isValidHash).toBe(true);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let testUser: TestUser;

    beforeEach(async () => {
      testUser = await createTestUser(prisma, {
        email: 'test@example.com',
        password: 'Password123!',
      });
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');

      // Check refresh token cookie
      const cookies = response.headers['set-cookie'] as string[];
      expect(cookies).toBeDefined();
      const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));
      expect(refreshCookie).toBeDefined();
    });

    it('should return 401 with wrong password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 401 with non-existent email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should set refresh token cookie with correct attributes', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const cookies = response.headers['set-cookie'] as string[];
      const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));

      expect(refreshCookie).toContain('HttpOnly');
      expect(refreshCookie).toContain('SameSite=Lax');
      expect(refreshCookie).toContain('Path=/');
      // In test env, secure should be false
      expect(refreshCookie).not.toContain('Secure');
    });

    it('should create refresh token record in database', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const refreshTokens = await prisma.refreshToken.findMany({
        where: { userId: testUser.id },
      });

      expect(refreshTokens.length).toBeGreaterThan(0);
      expect(refreshTokens[0]).toHaveProperty('tokenHash');
      expect(refreshTokens[0]).toHaveProperty('expiresAt');
      expect(refreshTokens[0].revoked).toBe(false);
    });

    it('should validate email format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
        })
        .expect(400);
    });

    it('should require both email and password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          password: testUser.password,
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let testUser: TestUser;
    let accessToken: string;

    beforeEach(async () => {
      testUser = await createTestUser(prisma);
      const { tokens } = await loginTestUser(
        app,
        testUser.email,
        testUser.password,
      );
      accessToken = tokens.accessToken;
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testUser.id);
      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).toHaveProperty('role');
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should return 401 without bearer token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return 401 with malformed authorization header', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);
    });

    it('should return 401 with expired token', async () => {
      // Create an expired token (this would need JWT service to create actual expired token)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjowfQ.invalid';
      
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let testUser: TestUser;
    let refreshToken: string;
    let cookies: string[];

    beforeEach(async () => {
      testUser = await createTestUser(prisma);
      const loginResult = await loginTestUser(
        app,
        testUser.email,
        testUser.password,
      );
      refreshToken = loginResult.tokens.refreshToken!;
      cookies = loginResult.cookies;
    });

    it('should refresh token using cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');

      // Should set new refresh cookie
      const newCookies = response.headers['set-cookie'] as string[];
      expect(newCookies).toBeDefined();
      const newRefreshCookie = newCookies.find((c) =>
        c.startsWith('refreshToken='),
      );
      expect(newRefreshCookie).toBeDefined();
    });

    it('should refresh token using body when cookie not present', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
    });

    it('should prioritize cookie over body token', async () => {
      const differentToken = 'different.token.value';

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookies)
        .send({ refreshToken: differentToken })
        .expect(200);

      // Should succeed with cookie token (not body token)
      expect(response.body).toHaveProperty('accessToken');
    });

    it('should return 401 when no refresh token provided', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .expect(401);
    });

    it('should return 401 with invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid.token' })
        .expect(401);
    });

    it('should return 401 with tampered refresh token', async () => {
      const tamperedToken = createTamperedRefreshToken(refreshToken);

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: tamperedToken })
        .expect(401);
    });

    it('should invalidate old refresh token after rotation', async () => {
      // First refresh - should succeed
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookies)
        .expect(200);

      // Try to use old token again - should fail
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookies)
        .expect(401);
    });

    it('should issue new access token with correct payload', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookies)
        .expect(200);

      const newAccessToken = response.body.accessToken;

      // Verify new access token works
      const meResponse = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(meResponse.body.id).toBe(testUser.id);
    });

    it('should return 401 with revoked refresh token', async () => {
      // Revoke the token
      const [tokenId] = refreshToken.split('.');
      await prisma.refreshToken.update({
        where: { id: tokenId },
        data: { revoked: true },
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });

    it('should return 401 with expired refresh token', async () => {
      // Create expired token
      const expiredToken = await prisma.refreshToken.create({
        data: {
          userId: testUser.id,
          tokenHash: await bcrypt.hash('raw-token', 4),
          expiresAt: new Date(Date.now() - 1000), // Already expired
          revoked: false,
        },
      });

      const compositeToken = `${expiredToken.id}.raw-token`;

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: compositeToken })
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let testUser: TestUser;
    let refreshToken: string;
    let cookies: string[];

    beforeEach(async () => {
      testUser = await createTestUser(prisma);
      const loginResult = await loginTestUser(
        app,
        testUser.email,
        testUser.password,
      );
      refreshToken = loginResult.tokens.refreshToken!;
      cookies = loginResult.cookies;
    });

    it('should logout successfully with cookie token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', cookies)
        .expect(204);

      // Verify token is revoked in database
      const [tokenId] = refreshToken.split('.');
      const token = await prisma.refreshToken.findUnique({
        where: { id: tokenId },
      });
      expect(token?.revoked).toBe(true);
    });

    it('should logout successfully with body token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refreshToken })
        .expect(204);

      // Verify token is revoked
      const [tokenId] = refreshToken.split('.');
      const token = await prisma.refreshToken.findUnique({
        where: { id: tokenId },
      });
      expect(token?.revoked).toBe(true);
    });

    it('should clear refresh cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', cookies)
        .expect(204);

      const setCookies = response.headers['set-cookie'] as string[];
      const clearedCookie = setCookies?.find((c) =>
        c.startsWith('refreshToken='),
      );

      expect(clearedCookie).toBeDefined();
      // Cookie should be cleared (expired or empty)
      expect(
        clearedCookie?.includes('Max-Age=0') ||
          clearedCookie?.includes('Expires='),
      ).toBeTruthy();
    });

    it('should succeed even without token (idempotent)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(204);
    });

    it('should prevent using token after logout', async () => {
      // Logout
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', cookies)
        .expect(204);

      // Try to refresh with logged out token
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookies)
        .expect(401);
    });

    it('should prioritize cookie over body token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', cookies)
        .send({ refreshToken: 'different.token' })
        .expect(204);

      // Cookie token should be revoked
      const [tokenId] = refreshToken.split('.');
      const token = await prisma.refreshToken.findUnique({
        where: { id: tokenId },
      });
      expect(token?.revoked).toBe(true);
    });
  });

  describe('Cookie Security', () => {
    let testUser: TestUser;

    beforeEach(async () => {
      testUser = await createTestUser(prisma);
    });

    it('should set HttpOnly flag on refresh cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const cookies = response.headers['set-cookie'] as string[];
      const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));

      expect(refreshCookie).toContain('HttpOnly');
    });

    it('should set SameSite=Lax on refresh cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const cookies = response.headers['set-cookie'] as string[];
      const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));

      expect(refreshCookie).toContain('SameSite=Lax');
    });

    it('should set Path=/ on refresh cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const cookies = response.headers['set-cookie'] as string[];
      const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));

      expect(refreshCookie).toContain('Path=/');
    });

    it('should set correct Max-Age on refresh cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const cookies = response.headers['set-cookie'] as string[];
      const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));

      // Should have Max-Age set (1 day in test config = 86400 seconds)
      expect(refreshCookie).toContain('Max-Age=');
    });
  });

  describe('Token Rotation & Security', () => {
    let testUser: TestUser;
    let firstRefreshToken: string;
    let firstCookies: string[];

    beforeEach(async () => {
      testUser = await createTestUser(prisma);
      const loginResult = await loginTestUser(
        app,
        testUser.email,
        testUser.password,
      );
      firstRefreshToken = loginResult.tokens.refreshToken!;
      firstCookies = loginResult.cookies;
    });

    it('should rotate refresh token on each use', async () => {
      // First refresh
      const firstRefresh = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', firstCookies)
        .expect(200);

      const secondCookies = firstRefresh.headers['set-cookie'] as string[];
      const secondRefreshToken = extractRefreshTokenFromCookie(secondCookies);

      expect(secondRefreshToken).toBeDefined();
      expect(secondRefreshToken).not.toBe(firstRefreshToken);

      // Second refresh with new token
      const secondRefresh = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', secondCookies)
        .expect(200);

      const thirdCookies = secondRefresh.headers['set-cookie'] as string[];
      const thirdRefreshToken = extractRefreshTokenFromCookie(thirdCookies);

      expect(thirdRefreshToken).not.toBe(secondRefreshToken);
    });

    it('should revoke old token after rotation', async () => {
      // Rotate token
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', firstCookies)
        .expect(200);

      // Old token should be revoked
      const [tokenId] = firstRefreshToken.split('.');
      const oldToken = await prisma.refreshToken.findUnique({
        where: { id: tokenId },
      });

      expect(oldToken?.revoked).toBe(true);
    });

    it('should detect refresh token reuse', async () => {
      // First use - should succeed and rotate
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', firstCookies)
        .expect(200);

      // Second use of same token - should fail (token theft detection)
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', firstCookies)
        .expect(401);
    });

    it('should maintain session across multiple refreshes', async () => {
      let currentCookies = firstCookies;

      // Perform multiple refreshes
      for (let i = 0; i < 3; i++) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/refresh')
          .set('Cookie', currentCookies)
          .expect(200);

        // Verify we can use the new access token
        const accessToken = response.body.accessToken;
        const meResponse = await request(app.getHttpServer())
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(meResponse.body.id).toBe(testUser.id);

        // Update cookies for next iteration
        currentCookies = response.headers['set-cookie'] as string[];
      }
    });
  });

  describe('Complete Auth Flow', () => {
    it('should complete full authentication flow', async () => {
      // 1. Register
      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'flowtest@example.com',
          password: 'Password123!',
          username: 'flowtest',
        })
        .expect(201);

      const userId = registerResponse.body.id;

      // 2. Login
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'flowtest@example.com',
          password: 'Password123!',
        })
        .expect(200);

      const accessToken = loginResponse.body.accessToken;
      const cookies = loginResponse.headers['set-cookie'] as string[];

      // 3. Access protected route
      const meResponse = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(meResponse.body.id).toBe(userId);

      // 4. Refresh token
      const refreshResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookies)
        .expect(200);

      const newAccessToken = refreshResponse.body.accessToken;

      // 5. Use new access token
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      // 6. Logout
      const newCookies = refreshResponse.headers['set-cookie'] as string[];
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', newCookies)
        .expect(204);

      // 7. Verify can't use token after logout
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', newCookies)
        .expect(401);
    });
  });
});
