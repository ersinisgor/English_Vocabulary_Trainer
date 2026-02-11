import { Role } from 'generated/prisma';

export const LoginRequestSchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: {
      type: 'string',
      example: 'alice@example.com',
    },
    password: {
      type: 'string',
      example: 'strongPassword123',
      minLength: 8,
    },
  },
};

export const LoginResponseSchema = {
  type: 'object',
  properties: {
    accessToken: {
      type: 'string',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      description: 'JWT access token used in Authorization header',
    },
    refreshToken: {
      type: 'string',
      nullable: true,
      example: 'clu278fem0000c9nbwq3x7m7v.a92b1c3f8...',
      description:
        'Refresh token for non-browser clients (usually sent via HttpOnly cookie)',
    },
  },
};

export const RegisterRequestSchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: {
      type: 'string',
      example: 'john@example.com',
    },
    username: {
      type: 'string',
      nullable: true,
      example: 'johnny',
    },
    password: {
      type: 'string',
      minLength: 8,
      example: 'StrongP@ssw0rd',
    },
  },
};

export const RegisterResponseSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      example: 'clu278fem0000c9nbwq3x7m7v',
    },
    email: {
      type: 'string',
      example: 'john@example.com',
    },
    username: {
      type: 'string',
      nullable: true,
      example: 'johnny',
    },
    role: {
      type: 'string',
      enum: Object.values(Role),
      example: Role.ADMIN,
    },
  },
};

export const RefreshRequestSchema = {
  type: 'object',
  properties: {
    refreshToken: {
      type: 'string',
      nullable: true,
      example: 'clu278fem0000c9nbwq3x7m7v.12ab34cd...',
    },
  },
};

export const LogoutRequestSchema = {
  type: 'object',
  properties: {
    refreshToken: {
      type: 'string',
      nullable: true,
      example: 'clu278fem0000c9nbwq3x7m7v.abcd1234...',
    },
  },
};
