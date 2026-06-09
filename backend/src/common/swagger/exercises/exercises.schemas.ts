import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { ExerciseType, LanguageSetting, SessionStatus } from 'generated/prisma';

export const SessionQuestionSchema: SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'clu2abc123' },
    questionOrder: { type: 'number', example: 0 },
    questionText: { type: 'string', example: 'spectacular' },
    correctAnswer: { type: 'string', example: 'muhteşem' },
    options: {
      type: 'array',
      items: { type: 'string' },
      example: ['muhteşem', 'dikkat etmek', 'fark etmek', 'koşmak'],
    },
    isAnswered: { type: 'boolean', example: false },
    isCorrect: { type: 'boolean', nullable: true, example: null },
    userAnswer: { type: 'string', nullable: true, example: null },
    answeredAt: { type: 'string', format: 'date-time', nullable: true },
  },
};

export const SessionSchema: SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'clu2abc123' },
    exerciseType: { type: 'string', enum: Object.values(ExerciseType) },
    languageSetting: { type: 'string', enum: Object.values(LanguageSetting) },
    status: { type: 'string', enum: Object.values(SessionStatus) },
    totalQuestions: { type: 'number', example: 10 },
    answeredCount: { type: 'number', example: 0 },
    correctCount: { type: 'number', example: 0 },
    wrongCount: { type: 'number', example: 0 },
    startedAt: { type: 'string', format: 'date-time' },
    completedAt: { type: 'string', format: 'date-time', nullable: true },
    questions: { type: 'array', items: SessionQuestionSchema },
  },
};

export const StartSessionSchema: SchemaObject = {
  type: 'object',
  required: ['exerciseType', 'languageSetting'],
  properties: {
    exerciseType: { type: 'string', enum: Object.values(ExerciseType) },
    languageSetting: { type: 'string', enum: Object.values(LanguageSetting) },
    questionCount: { type: 'number', example: 10, minimum: 1, maximum: 50 },
  },
};

export const AnswerQuestionSchema: SchemaObject = {
  type: 'object',
  required: ['questionId', 'answer'],
  properties: {
    questionId: { type: 'string', example: 'clu2abc123' },
    answer: { type: 'string', example: 'correct' },
  },
};

export const SubmitAnswerResponseSchema: SchemaObject = {
  type: 'object',
  properties: {
    question: SessionQuestionSchema,
    session: {
      type: 'object',
      properties: {
        answeredCount: { type: 'number', example: 1 },
        correctCount: { type: 'number', example: 1 },
        wrongCount: { type: 'number', example: 0 },
        status: { type: 'string', enum: Object.values(SessionStatus) },
      },
    },
  },
};
