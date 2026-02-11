import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  SuccessSchema,
  UnauthorizedError,
  WordValidationError,
  WordNotFoundError,
  WordConflictError,
  InternalServerError,
} from '../responses.swagger';
import {
  WordSchema,
  CreateWordSchema,
  UpdateWordSchema,
  WordPaginationSchema,
} from './words.schemas';
import { PartOfSpeech, WordLevel } from 'generated/prisma';

const WORD_ERRORS = [
  { status: 401, schema: UnauthorizedError },
  { status: 500, schema: InternalServerError },
];

/* =========================
 * CREATE WORD
 * ========================= */
export function ApiCreateWord() {
  return applyDecorators(
    ApiTags('Words'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Create word' }),
    ApiBody({ schema: CreateWordSchema }),
    ApiResponse({
      status: 201,
      schema: SuccessSchema(WordSchema),
    }),
    ApiResponse({ status: 400, schema: WordValidationError }),
    ApiResponse({ status: 409, schema: WordConflictError }),
    ...WORD_ERRORS.map((e) => ApiResponse(e)),
  );
}

/* =========================
 * GET WORDS (PAGINATED)
 * ========================= */
export function ApiGetWords() {
  return applyDecorators(
    ApiTags('Words'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get paginated words' }),
    ApiQuery({ name: 'page', required: false, type: Number }),
    ApiQuery({ name: 'limit', required: false, type: Number }),
    ApiQuery({ name: 'level', required: false, enum: WordLevel }),
    ApiQuery({ name: 'partOfSpeech', required: false, enum: PartOfSpeech }),
    ApiQuery({ name: 'search', required: false, type: String }),
    ApiResponse({
      status: 200,
      schema: SuccessSchema(WordPaginationSchema),
    }),
    ...WORD_ERRORS.map((e) => ApiResponse(e)),
  );
}

/* =========================
 * GET WORD BY ID
 * ========================= */
export function ApiGetWordById() {
  return applyDecorators(
    ApiTags('Words'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get word by id' }),
    ApiParam({ name: 'id', type: String }),
    ApiResponse({
      status: 200,
      schema: SuccessSchema(WordSchema),
    }),
    ApiResponse({ status: 404, schema: WordNotFoundError }),
    ...WORD_ERRORS.map((e) => ApiResponse(e)),
  );
}

/* =========================
 * UPDATE WORD
 * ========================= */
export function ApiUpdateWord() {
  return applyDecorators(
    ApiTags('Words'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Update word' }),
    ApiParam({ name: 'id', type: String }),
    ApiBody({ schema: UpdateWordSchema }),
    ApiResponse({
      status: 200,
      schema: SuccessSchema(WordSchema),
    }),
    ApiResponse({ status: 404, schema: WordNotFoundError }),
    ApiResponse({ status: 409, schema: WordConflictError }),
    ...WORD_ERRORS.map((e) => ApiResponse(e)),
  );
}

/* =========================
 * DELETE WORD
 * ========================= */
export function ApiDeleteWord() {
  return applyDecorators(
    ApiTags('Words'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Delete word' }),
    ApiParam({ name: 'id', type: String }),
    ApiResponse({
      status: 200,
      schema: SuccessSchema({ type: 'null' }),
    }),
    ApiResponse({ status: 404, schema: WordNotFoundError }),
    ...WORD_ERRORS.map((e) => ApiResponse(e)),
  );
}
