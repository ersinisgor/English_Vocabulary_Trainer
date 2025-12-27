import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import {
  LoginRequestSchema,
  LoginResponseSchema,
  RegisterRequestSchema,
  RegisterResponseSchema,
  RefreshRequestSchema,
  LogoutRequestSchema,
} from './auth.schemas';

import { SuccessSchema } from './responses.swagger';

/**
 * =========================
 * LOGIN
 * =========================
 */
export function ApiLogin() {
  return applyDecorators(
    ApiTags('Auth'),
    ApiOperation({
      summary: 'Login user',
      description:
        'Authenticates user credentials and returns access token. Refresh token is usually sent via HttpOnly cookie.',
    }),
    ApiBody({ schema: LoginRequestSchema }),
    ApiResponse({
      status: 200,
      description: 'Login successful',
      schema: SuccessSchema(LoginResponseSchema),
    }),
    ApiResponse({
      status: 401,
      description: 'Invalid email or password',
    }),
  );
}

/**
 * =========================
 * REGISTER
 * =========================
 */
export function ApiRegister() {
  return applyDecorators(
    ApiTags('Auth'),
    ApiOperation({
      summary: 'Register new user',
      description: 'Creates a new user account',
    }),
    ApiBody({ schema: RegisterRequestSchema }),
    ApiResponse({
      status: 201,
      description: 'User successfully registered',
      schema: SuccessSchema(RegisterResponseSchema),
    }),
    ApiResponse({
      status: 409,
      description: 'Email already exists',
    }),
  );
}

/**
 * =========================
 * ME
 * =========================
 */
export function ApiGetMe() {
  return applyDecorators(
    ApiTags('Auth'),
    ApiOperation({
      summary: 'Get current user',
      description: 'Returns authenticated user profile',
    }),
    ApiResponse({
      status: 200,
      description: 'Authenticated user',
      schema: SuccessSchema(RegisterResponseSchema),
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
    }),
  );
}

/**
 * =========================
 * REFRESH TOKEN
 * =========================
 */
export function ApiRefresh() {
  return applyDecorators(
    ApiTags('Auth'),
    ApiOperation({
      summary: 'Refresh access token',
      description:
        'Generates a new access token using refresh token (cookie-based or body)',
    }),
    ApiCookieAuth(),
    ApiBody({ schema: RefreshRequestSchema }),
    ApiResponse({
      status: 200,
      description: 'New access token generated',
      schema: SuccessSchema(LoginResponseSchema),
    }),
    ApiResponse({
      status: 401,
      description: 'Invalid or expired refresh token',
    }),
  );
}

/**
 * =========================
 * LOGOUT
 * =========================
 */
export function ApiLogout() {
  return applyDecorators(
    ApiTags('Auth'),
    ApiOperation({
      summary: 'Logout user',
      description:
        'Revokes refresh token and clears authentication cookies if present',
    }),
    ApiCookieAuth(),
    ApiBody({ schema: LogoutRequestSchema }),
    ApiResponse({
      status: 204,
      description: 'Logout successful',
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
    }),
  );
}
