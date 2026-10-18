import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

export const FolderSchema: SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'clf1abc123' },
    name: { type: 'string', example: 'Academic Vocabulary' },
    userId: { type: 'string', example: 'clu1xyz789' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};
