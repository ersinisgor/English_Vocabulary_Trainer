import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

export const WordListSchema: SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'clw1abc123' },
    name: { type: 'string', example: 'Unit 1 — Verbs' },
    userId: { type: 'string', example: 'clu1xyz789' },
    folderId: { type: 'string', nullable: true, example: 'clf1abc123' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const WordListWithItemsSchema: SchemaObject = {
  type: 'object',
  properties: {
    ...WordListSchema.properties,
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          word: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'clx1abc123' },
              word: { type: 'string', example: 'notice' },
              level: { type: 'string', nullable: true, example: 'B1' },
              partOfSpeech: { type: 'string', example: 'VERB' },
            },
          },
        },
      },
    },
  },
};
