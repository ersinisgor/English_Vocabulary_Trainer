import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

export const ImportErrorSchema: SchemaObject = {
  type: 'object',
  properties: {
    word_no: {
      type: 'number',
      nullable: true,
      description: 'Word number from the Excel file',
    },
    meaning_order: {
      type: 'number',
      nullable: true,
      description: 'Meaning order from the Excel file',
    },
    field: {
      type: 'string',
      description: 'The field where the error occurred',
      example: 'word',
    },
    message: {
      type: 'string',
      description: 'Error message describing the issue',
      example: 'Invalid part of speech: XXX',
    },
  },
};

export const ImportResponseSchema: SchemaObject = {
  type: 'object',
  properties: {
    totalWords: {
      type: 'number',
      description: 'Total number of words imported',
      example: 25,
    },
    totalMeanings: {
      type: 'number',
      description: 'Total number of word meanings imported',
      example: 42,
    },
    totalSplittedMeanings: {
      type: 'number',
      description: 'Total number of splitted native meanings imported',
      example: 68,
    },
    totalExamples: {
      type: 'number',
      description: 'Total number of example sentences imported',
      example: 35,
    },
    totalTags: {
      type: 'number',
      description: 'Total number of tag associations created',
      example: 18,
    },
    errors: {
      type: 'array',
      description: 'Array of import errors, if any',
      items: ImportErrorSchema,
    },
  },
};

export const FileUploadSchema: SchemaObject = {
  type: 'object',
  required: ['file'],
  properties: {
    file: {
      type: 'string',
      format: 'binary',
      description: 'Excel file (.xlsx, .xls) or CSV file',
    },
  },
};
