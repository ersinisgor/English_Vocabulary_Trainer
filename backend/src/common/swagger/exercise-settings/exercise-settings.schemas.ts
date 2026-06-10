import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

export const PresetSchema: SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'clp1abc123' },
    name: { type: 'string', example: 'Hard B2 Verbs' },
    userId: { type: 'string', example: 'clu1xyz789' },
    exerciseType: { type: 'string', example: 'MULTIPLE_CHOICE' },
    languageSetting: { type: 'string', example: 'ENGLISH_NATIVE' },
    questionCount: { type: 'number', example: 15 },
    numberOfOptions: { type: 'number', example: 6 },
    questionFormat: {
      type: 'string',
      nullable: true,
      example: 'ENGLISH_WORD',
    },
    answerFormat: {
      type: 'string',
      nullable: true,
      example: 'ENGLISH_DEFINITION',
    },
    exampleOrder: { type: 'number', nullable: true, example: null },
    frontFormats: { type: 'array', items: { type: 'string' }, example: [] },
    backFormats: { type: 'array', items: { type: 'string' }, example: [] },
    folderIds: { type: 'array', items: { type: 'string' }, example: [] },
    wordListIds: { type: 'array', items: { type: 'string' }, example: [] },
    levels: { type: 'array', items: { type: 'string' }, example: ['B2'] },
    partsOfSpeech: {
      type: 'array',
      items: { type: 'string' },
      example: ['VERB'],
    },
    onlyStarred: { type: 'boolean', example: false },
    onlyKeepLearning: { type: 'boolean', example: false },
    excludeLearned: { type: 'boolean', example: true },
    tagIds: { type: 'array', items: { type: 'string' }, example: [] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};
