import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import {
  EmailConflictError,
  ForbiddenError,
  InternalServerError,
  SuccessSchema,
  UnauthorizedError,
  UserNotFoundError,
  ValidationError,
} from '../responses.swagger';
import {
  UserSchema,
  CreateUserSchema,
  UpdateUserSchema,
  UpdateMeSchema,
  UpdateUserRoleSchema,
} from './users.schemas';

/**
 * =========================
 * GET ALL USERS (ADMIN)
 * =========================
 */
export function ApiGetAllUsers() {
  return applyDecorators(
    ApiTags('Users'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get all users (ADMIN only)' }),
    ApiResponse({
      status: 200,
      description: 'List of users',
      schema: SuccessSchema({
        type: 'array',
        items: UserSchema,
      }),
    }),
    ApiResponse({
      status: 401,
      schema: UnauthorizedError,
    }),
    ApiResponse({
      status: 403,
      schema: ForbiddenError,
    }),
    ApiResponse({
      status: 500,
      schema: InternalServerError,
    }),
  );
}

/**
 * =========================
 * GET USER BY EMAIL (ADMIN)
 * =========================
 */
export function ApiGetUserByEmail() {
  return applyDecorators(
    ApiTags('Users'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get user by email (ADMIN only)' }),
    ApiParam({
      name: 'email',
      description: 'Email of the user',
      type: String,
    }),
    ApiResponse({
      status: 200,
      schema: SuccessSchema(UserSchema),
    }),
    ApiResponse({
      status: 401,
      schema: UnauthorizedError,
    }),
    ApiResponse({
      status: 403,
      schema: ForbiddenError,
    }),
    ApiResponse({
      status: 404,
      schema: UserNotFoundError,
    }),
    ApiResponse({
      status: 500,
      schema: InternalServerError,
    }),
  );
}

/**
 * =========================
 * CREATE USER (ADMIN)
 * =========================
 */
export function ApiCreateUser() {
  return applyDecorators(
    ApiTags('Users'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Create user (ADMIN only)' }),
    ApiBody({ schema: CreateUserSchema }),
    ApiResponse({
      status: 201,
      schema: SuccessSchema(UserSchema),
    }),
    ApiResponse({
      status: 400,
      schema: ValidationError,
    }),
    ApiResponse({
      status: 401,
      schema: UnauthorizedError,
    }),
    ApiResponse({
      status: 403,
      schema: ForbiddenError,
    }),
    ApiResponse({
      status: 409,
      schema: EmailConflictError,
    }),
    ApiResponse({
      status: 500,
      schema: InternalServerError,
    }),
  );
}

/**
 * =========================
 * UPDATE ME
 * =========================
 */
export function ApiUpdateMe() {
  return applyDecorators(
    ApiTags('Users'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Update current user profile' }),
    ApiBody({ schema: UpdateMeSchema }),
    ApiResponse({
      status: 200,
      schema: SuccessSchema(UserSchema),
    }),
    ApiResponse({
      status: 400,
      schema: ValidationError,
    }),
    ApiResponse({
      status: 401,
      schema: UnauthorizedError,
    }),
    ApiResponse({
      status: 404,
      schema: UserNotFoundError,
    }),
    ApiResponse({
      status: 500,
      schema: InternalServerError,
    }),
  );
}

/**
 * =========================
 * UPDATE USER (ADMIN)
 * =========================
 */
export function ApiUpdateUser() {
  return applyDecorators(
    ApiTags('Users'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Update user (ADMIN only)' }),
    ApiParam({ name: 'id', type: String }),
    ApiBody({ schema: UpdateUserSchema }),
    ApiResponse({
      status: 200,
      schema: SuccessSchema(UserSchema),
    }),
    ApiResponse({
      status: 400,
      schema: ValidationError,
    }),
    ApiResponse({
      status: 401,
      schema: UnauthorizedError,
    }),
    ApiResponse({
      status: 403,
      schema: ForbiddenError,
    }),
    ApiResponse({
      status: 404,
      schema: UserNotFoundError,
    }),
    ApiResponse({
      status: 409,
      schema: EmailConflictError,
    }),
    ApiResponse({
      status: 500,
      schema: InternalServerError,
    }),
  );
}

/**
 * =========================
 * UPDATE USER ROLE (ADMIN)
 * =========================
 */
export function ApiUpdateUserRole() {
  return applyDecorators(
    ApiTags('Users'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Update user role (ADMIN only)' }),
    ApiParam({
      name: 'id',
      type: String,
      description: 'User ID',
    }),
    ApiBody({
      schema: UpdateUserRoleSchema,
    }),
    ApiResponse({
      status: 200,
      description: 'User role updated successfully',
      schema: SuccessSchema(UserSchema),
    }),
    ApiResponse({
      status: 400,
      schema: ValidationError,
    }),
    ApiResponse({
      status: 401,
      schema: UnauthorizedError,
    }),
    ApiResponse({
      status: 403,
      schema: ForbiddenError,
    }),
    ApiResponse({
      status: 404,
      schema: UserNotFoundError,
    }),
    ApiResponse({
      status: 500,
      schema: InternalServerError,
    }),
  );
}

/**
 * =========================
 * DELETE USER (ADMIN)
 * =========================
 */
export function ApiDeleteUser() {
  return applyDecorators(
    ApiTags('Users'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Delete user (ADMIN only)' }),
    ApiParam({ name: 'id', type: String }),
    ApiResponse({
      status: 200,
      schema: SuccessSchema({ type: 'null' }),
    }),
    ApiResponse({
      status: 401,
      schema: UnauthorizedError,
    }),
    ApiResponse({
      status: 403,
      schema: ForbiddenError,
    }),
    ApiResponse({
      status: 404,
      schema: UserNotFoundError,
    }),
    ApiResponse({
      status: 500,
      schema: InternalServerError,
    }),
  );
}
