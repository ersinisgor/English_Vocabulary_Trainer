import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { PrismaClient, Role, User } from '../generated/prisma';

export interface TestUser {
  id: string;
  email: string;
  username: string | null;
  password: string; // plain text
  passwordHash: string;
  role: Role;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

/**
 * Create a test user in the database
 */
export async function createTestUser(
  prisma: PrismaClient,
  overrides?: Partial<TestUser>,
): Promise<TestUser> {
  const password = overrides?.password ?? 'Test123!@#';
  const passwordHash = await bcrypt.hash(password, 4);

  const user = await prisma.user.create({
    data: {
      email: overrides?.email ?? `test-${Date.now()}@example.com`,
      username: overrides?.username ?? `testuser${Date.now()}`,
      passwordHash,
      role: overrides?.role ?? Role.USER,
    },
  });

  return {
    ...user,
    password,
    passwordHash,
  };
}

/**
 * Login a test user and get tokens
 */
export async function loginTestUser(
  app: INestApplication,
  email: string,
  password: string,
): Promise<{ tokens: AuthTokens; cookies: string[] }> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);

  const cookies = response.headers['set-cookie'] as unknown as string[];
  const refreshTokenFromCookie = extractRefreshTokenFromCookie(cookies);

  return {
    tokens: {
      accessToken: response.body.accessToken,
      refreshToken: refreshTokenFromCookie,
    },
    cookies,
  };
}

/**
 * Register a new test user
 */
export async function registerTestUser(
  app: INestApplication,
  email: string,
  password: string,
  username?: string,
): Promise<{ user: any; response: request.Response }> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      email,
      password,
      username: username ?? `user_${Date.now()}`,
    })
    .expect(201);

  return {
    user: response.body,
    response,
  };
}

/**
 * Extract refresh token from cookie header
 */
export function extractRefreshTokenFromCookie(
  cookies: string[],
): string | undefined {
  if (!cookies) return undefined;

  const refreshCookie = cookies.find((cookie) =>
    cookie.startsWith('refresh_token='),
  );
  if (!refreshCookie) return undefined;

  const match = refreshCookie.match(/refresh_token=([^;]+)/);
  return match ? match[1] : undefined;
}

/**
 * Create an expired JWT token for testing
 */
export function createExpiredToken(): string {
  // This is a mock expired token - in real tests you'd use a JWT library
  // with a past expiration date
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjB9.invalid';
}

/**
 * Create a tampered refresh token
 */
export function createTamperedRefreshToken(validToken: string): string {
  const [id, raw] = validToken.split('.');
  return `${id}.tampered${raw}`;
}

/**
 * Wait for a specific amount of time (for testing time-based logic)
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create multiple test users
 */
export async function createTestUsers(
  prisma: PrismaClient,
  count: number,
): Promise<TestUser[]> {
  const users: TestUser[] = [];
  for (let i = 0; i < count; i++) {
    const user = await createTestUser(prisma, {
      email: `test-user-${i}-${Date.now()}@example.com`,
      username: `testuser${i}_${Date.now()}`,
    });
    users.push(user);
  }
  return users;
}

/**
 * Get authenticated request with bearer token
 */
export function authenticatedRequest(
  app: INestApplication,
  method: 'get' | 'post' | 'patch' | 'delete',
  url: string,
  accessToken: string,
): request.Test {
  return request(app.getHttpServer())
    [method](url)
    .set('Authorization', `Bearer ${accessToken}`);
}

/**
 * Create a refresh token record in database
 */
export async function createRefreshToken(
  prisma: PrismaClient,
  userId: string,
  tokenHash: string,
  expiresInMs: number = 86400000, // 1 day
): Promise<{ id: string; tokenHash: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + expiresInMs);

  return prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      revoked: false,
    },
  });
}

/**
 * Revoke a refresh token
 */
export async function revokeRefreshToken(
  prisma: PrismaClient,
  tokenId: string,
): Promise<void> {
  await prisma.refreshToken.update({
    where: { id: tokenId },
    data: { revoked: true },
  });
}
