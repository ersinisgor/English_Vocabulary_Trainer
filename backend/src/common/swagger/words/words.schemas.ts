import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { PartOfSpeech, WordLevel } from 'generated/prisma';

export const WordSchema: SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'clu2abc123' },
    word: { type: 'string', example: 'run' },
    level: {
      type: 'string',
      enum: Object.values(WordLevel),
      nullable: true,
    },
    partOfSpeech: {
      type: 'string',
      enum: Object.values(PartOfSpeech),
    },
    userId: { type: 'string' },
    createdAt: {
      type: 'string',
      format: 'date-time',
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
    },
  },
};

export const CreateWordSchema: SchemaObject = {
  type: 'object',
  required: ['word', 'partOfSpeech'],
  properties: {
    word: { type: 'string', example: 'run' },
    level: {
      type: 'string',
      enum: Object.values(WordLevel),
      nullable: true,
    },
    partOfSpeech: {
      type: 'string',
      enum: Object.values(PartOfSpeech),
    },
  },
};

export const UpdateWordSchema: SchemaObject = {
  type: 'object',
  properties: {
    word: { type: 'string', example: 'running' },
    level: {
      type: 'string',
      enum: Object.values(WordLevel),
    },
    partOfSpeech: {
      type: 'string',
      enum: Object.values(PartOfSpeech),
    },
  },
};

export const WordPaginationSchema: SchemaObject = {
  type: 'object',
  properties: {
    data: {
      type: 'array',
      items: WordSchema,
    },
    meta: {
      type: 'object',
      properties: {
        total: { type: 'number', example: 120 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 20 },
      },
    },
  },
};
