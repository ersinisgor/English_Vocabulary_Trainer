import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

/* =====================================================
 * BASE / GENERIC SCHEMAS
 * ===================================================== */

export const BaseErrorSchema = (
  statusCode: number,
  messageExample: string | string[],
  error?: string,
): SchemaObject => ({
  type: 'object',
  properties: {
    statusCode: {
      type: 'number',
      example: statusCode,
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
      example: '2025-12-29T03:01:12.847Z',
    },
    path: {
      type: 'string',
      example: '/auth/login',
    },
    message: Array.isArray(messageExample)
      ? { type: 'array', items: { type: 'string' }, example: messageExample }
      : { type: 'string', example: messageExample },
    ...(error && {
      error: { type: 'string', example: error },
    }),
  },
  required: ['statusCode', 'timestamp', 'path', 'message'],
});

export const ErrorOneOfSchema = (
  variants: {
    statusCode: number;
    message: string | string[];
    error?: string;
  }[],
): SchemaObject => ({
  oneOf: variants.map((v) => BaseErrorSchema(v.statusCode, v.message, v.error)),
});

export const SuccessSchema = (dataSchema: SchemaObject): SchemaObject => ({
  type: 'object',
  properties: {
    success: {
      type: 'boolean',
      example: true,
    },
    data: dataSchema,
  },
  required: ['success', 'data'],
});

/* =====================================================
 * GENERAL / CROSS-MODULE ERRORS
 * ===================================================== */

export const UnauthorizedError = BaseErrorSchema(
  401,
  'Unauthorized',
  'Unauthorized',
);

export const ForbiddenError = BaseErrorSchema(
  403,
  'Insufficient role',
  'Forbidden',
);

export const ValidationError = BaseErrorSchema(
  400,
  [
    'email must be an email',
    'password must be longer than or equal to 8 characters',
  ],
  'Bad Request',
);

export const InternalServerError = BaseErrorSchema(
  500,
  'Internal server error',
);

/* =====================================================
 * USERS MODULE ERRORS
 * ===================================================== */

export const UserNotFoundError = BaseErrorSchema(
  404,
  'User not found',
  'Not Found',
);

export const EmailConflictError = BaseErrorSchema(
  409,
  'Email already in use',
  'Conflict',
);

/* =====================================================
 * AUTH MODULE ERRORS
 * ===================================================== */

export const InvalidCredentialsError = BaseErrorSchema(
  401,
  'Invalid email or password',
  'Unauthorized',
);

export const RefreshTokenErrors = ErrorOneOfSchema([
  {
    statusCode: 401,
    message: 'Refresh token missing',
    error: 'Unauthorized',
  },
  {
    statusCode: 401,
    message: 'Malformed refresh token',
    error: 'Unauthorized',
  },
  {
    statusCode: 401,
    message: 'Invalid refresh token',
    error: 'Unauthorized',
  },
  {
    statusCode: 401,
    message: 'Refresh token revoked',
    error: 'Unauthorized',
  },
  {
    statusCode: 401,
    message: 'Refresh token expired',
    error: 'Unauthorized',
  },
  {
    statusCode: 401,
    message: 'User not found',
    error: 'Unauthorized',
  },
]);

/* =====================================================
 * WORDS MODULE ERRORS
 * ===================================================== */

export const WordValidationError = BaseErrorSchema(
  400,
  ['word should not be empty'],
  'Bad Request',
);

export const WordNotFoundError = BaseErrorSchema(
  404,
  'Word not found',
  'Not Found',
);

export const WordConflictError = BaseErrorSchema(
  409,
  'Word already exists',
  'Conflict',
);
