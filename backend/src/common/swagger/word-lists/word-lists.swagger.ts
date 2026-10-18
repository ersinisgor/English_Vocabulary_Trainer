import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  SuccessSchema,
  UnauthorizedError,
  InternalServerError,
  ValidationError,
  BaseErrorSchema,
} from '../responses.swagger';
import { WordListSchema, WordListWithItemsSchema } from './word-lists.schemas';

const TAG = 'Word Lists';

const BASE_ERRORS = [
  { status: 401, schema: UnauthorizedError },
  { status: 500, schema: InternalServerError },
];

export const WordListNotFoundError = BaseErrorSchema(
  404,
  'Word list not found',
  'Not Found',
);

export const WordListConflictError = BaseErrorSchema(
  409,
  'A word list named "Unit 1 — Verbs" already exists.',
  'Conflict',
);

export const WordsNotOwnedError = BaseErrorSchema(
  400,
  'One or more words were not found or do not belong to you.',
  'Bad Request',
);

export function ApiCreateWordList() {
  return applyDecorators(
    ApiTags(TAG),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Create a new word list (optionally in a folder)',
    }),
    ApiResponse({ status: 201, schema: SuccessSchema(WordListSchema) }),
    ApiResponse({ status: 400, schema: ValidationError }),
    ApiResponse({ status: 409, schema: WordListConflictError }),
    ...BASE_ERRORS.map((e) => ApiResponse(e)),
  );
}

export function ApiGetWordLists() {
  return applyDecorators(
    ApiTags(TAG),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get all word lists for the authenticated user' }),
    ApiResponse({
      status: 200,
      schema: SuccessSchema({ type: 'array', items: WordListSchema }),
    }),
    ...BASE_ERRORS.map((e) => ApiResponse(e)),
  );
}

export function ApiGetWordListById() {
  return applyDecorators(
    ApiTags(TAG),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get a word list with its words' }),
    ApiParam({ name: 'id', type: String }),
    ApiResponse({
      status: 200,
      schema: SuccessSchema(WordListWithItemsSchema),
    }),
    ApiResponse({ status: 404, schema: WordListNotFoundError }),
    ...BASE_ERRORS.map((e) => ApiResponse(e)),
  );
}

export function ApiUpdateWordList() {
  return applyDecorators(
    ApiTags(TAG),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Update a word list (rename or move to folder)' }),
    ApiParam({ name: 'id', type: String }),
    ApiResponse({ status: 200, schema: SuccessSchema(WordListSchema) }),
    ApiResponse({ status: 404, schema: WordListNotFoundError }),
    ApiResponse({ status: 409, schema: WordListConflictError }),
    ...BASE_ERRORS.map((e) => ApiResponse(e)),
  );
}

export function ApiDeleteWordList() {
  return applyDecorators(
    ApiTags(TAG),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Delete a word list' }),
    ApiParam({ name: 'id', type: String }),
    ApiResponse({ status: 200, schema: SuccessSchema(WordListSchema) }),
    ApiResponse({ status: 404, schema: WordListNotFoundError }),
    ...BASE_ERRORS.map((e) => ApiResponse(e)),
  );
}

export function ApiAddWordsToList() {
  return applyDecorators(
    ApiTags(TAG),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Add words to a list' }),
    ApiParam({ name: 'id', type: String }),
    ApiResponse({
      status: 201,
      schema: SuccessSchema(WordListWithItemsSchema),
    }),
    ApiResponse({ status: 400, schema: WordsNotOwnedError }),
    ApiResponse({ status: 404, schema: WordListNotFoundError }),
    ...BASE_ERRORS.map((e) => ApiResponse(e)),
  );
}

export function ApiRemoveWordFromList() {
  return applyDecorators(
    ApiTags(TAG),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Remove a word from a list' }),
    ApiParam({ name: 'id', type: String }),
    ApiParam({ name: 'wordId', type: String }),
    ApiResponse({
      status: 200,
      schema: SuccessSchema(WordListWithItemsSchema),
    }),
    ApiResponse({ status: 404, schema: WordListNotFoundError }),
    ...BASE_ERRORS.map((e) => ApiResponse(e)),
  );
}
