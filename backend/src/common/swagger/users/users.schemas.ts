import { Role } from 'generated/prisma';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

export const UserSchema: SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'clu278fem0000c9nbwq3x7m7v' },
    email: { type: 'string', example: 'john@example.com' },
    username: { type: 'string', nullable: true, example: 'johnny' },
    role: { type: 'string', enum: Object.values(Role), nullable: true },
    createdAt: {
      type: 'string',
      format: 'date-time',
      example: '2025-01-01T12:00:00.000Z',
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      example: '2025-01-02T14:20:00.000Z',
    },
  },
};

export const CreateUserSchema: SchemaObject = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', example: 'john@example.com' },
    username: { type: 'string', nullable: true, example: 'johnny' },
    password: { type: 'string', minLength: 8, example: 'StrongP@ssw0rd' },
    role: {
      type: 'string',
      enum: Object.values(Role),
      description: 'ADMIN only field',
    },
  },
};

export const UpdateUserSchema: SchemaObject = {
  type: 'object',
  properties: {
    email: { type: 'string', example: 'newmail@example.com' },
    username: { type: 'string', example: 'newusername' },
    password: { type: 'string', minLength: 8, example: 'NewStrongP@ssw0rd' },
    role: { type: 'string', enum: Object.values(Role) },
  },
};

export const UpdateUserRoleSchema: SchemaObject = {
  type: 'object',
  required: ['role'],
  properties: {
    role: {
      type: 'string',
      enum: Object.values(Role),
      example: Role.ADMIN,
      description: 'New role of the user (ADMIN only)',
    },
  },
};

export const UpdateMeSchema: SchemaObject = {
  type: 'object',
  properties: {
    username: { type: 'string', example: 'newusername' },
    password: { type: 'string', minLength: 8, example: 'NewStrongP@ssw0rd' },
  },
};
