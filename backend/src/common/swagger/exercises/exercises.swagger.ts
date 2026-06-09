import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  SuccessSchema,
  UnauthorizedError,
  InternalServerError,
  SessionNotFoundError,
  SessionAlreadyCompletedError,
  QuestionAlreadyAnsweredError,
  NotEnoughMeaningsError,
} from '../responses.swagger';
import {
  SessionSchema,
  StartSessionSchema,
  AnswerQuestionSchema,
  SubmitAnswerResponseSchema,
} from './exercises.schemas';

const BASE_ERRORS = [
  { status: 401, schema: UnauthorizedError },
  { status: 500, schema: InternalServerError },
];

export function ApiStartSession() {
  return applyDecorators(
    ApiTags('Exercises'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Start a new exercise session' }),
    ApiBody({ schema: StartSessionSchema }),
    ApiResponse({ status: 201, schema: SuccessSchema(SessionSchema) }),
    ApiResponse({ status: 400, schema: NotEnoughMeaningsError }),
    ...BASE_ERRORS.map((e) => ApiResponse(e)),
  );
}

export function ApiGetSession() {
  return applyDecorators(
    ApiTags('Exercises'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get session state' }),
    ApiParam({ name: 'sessionId', type: String }),
    ApiResponse({ status: 200, schema: SuccessSchema(SessionSchema) }),
    ApiResponse({ status: 404, schema: SessionNotFoundError }),
    ...BASE_ERRORS.map((e) => ApiResponse(e)),
  );
}

export function ApiSubmitAnswer() {
  return applyDecorators(
    ApiTags('Exercises'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Submit an answer for a question' }),
    ApiParam({ name: 'sessionId', type: String }),
    ApiBody({ schema: AnswerQuestionSchema }),
    ApiResponse({ status: 201, schema: SuccessSchema(SubmitAnswerResponseSchema) }),
    ApiResponse({ status: 400, schema: SessionAlreadyCompletedError }),
    ApiResponse({ status: 400, schema: QuestionAlreadyAnsweredError }),
    ApiResponse({ status: 404, schema: SessionNotFoundError }),
    ...BASE_ERRORS.map((e) => ApiResponse(e)),
  );
}

export function ApiGetSessionResults() {
  return applyDecorators(
    ApiTags('Exercises'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get results for a completed session' }),
    ApiParam({ name: 'sessionId', type: String }),
    ApiResponse({ status: 200, schema: SuccessSchema(SessionSchema) }),
    ApiResponse({ status: 400, schema: SessionAlreadyCompletedError }),
    ApiResponse({ status: 404, schema: SessionNotFoundError }),
    ...BASE_ERRORS.map((e) => ApiResponse(e)),
  );
}
