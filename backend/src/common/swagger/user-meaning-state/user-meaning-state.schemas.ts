import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

export const UserMeaningStateSchema: SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'clu2abc123' },
    meaningId: { type: 'string', example: 'clu2def456' },
    isStarred: { type: 'boolean', example: false },
    keepLearning: { type: 'boolean', example: true },
    correctCount: { type: 'number', example: 5 },
    wrongCount: { type: 'number', example: 2 },
    practiceCount: { type: 'number', example: 7 },
    streakCount: { type: 'number', example: 3 },
    firstReviewAt: { type: 'string', format: 'date-time', nullable: true },
    lastReviewedAt: { type: 'string', format: 'date-time', nullable: true },
    nextReviewAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};
