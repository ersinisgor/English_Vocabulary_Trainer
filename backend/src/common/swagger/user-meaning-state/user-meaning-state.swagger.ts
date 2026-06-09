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
} from '../responses.swagger';
import { UserMeaningStateSchema } from './user-meaning-state.schemas';
import { MeaningNotFoundError } from '../responses.swagger';

const BASE_ERRORS = [
  { status: 401, schema: UnauthorizedError },
  { status: 500, schema: InternalServerError },
];

export function ApiGetUserMeaningStates() {
  return applyDecorators(
    ApiTags('User Meaning States'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get all meaning states for the authenticated user' }),
    ApiResponse({
      status: 200,
      schema: SuccessSchema({ type: 'array', items: UserMeaningStateSchema }),
    }),
    ...BASE_ERRORS.map((e) => ApiResponse(e)),
  );
}

export function ApiToggleStarMeaning() {
  return applyDecorators(
    ApiTags('User Meaning States'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Toggle star on a meaning' }),
    ApiParam({ name: 'meaningId', type: String }),
    ApiResponse({
      status: 200,
      schema: SuccessSchema(UserMeaningStateSchema),
    }),
    ApiResponse({ status: 404, schema: MeaningNotFoundError }),
    ...BASE_ERRORS.map((e) => ApiResponse(e)),
  );
}

export function ApiToggleKeepLearningMeaning() {
  return applyDecorators(
    ApiTags('User Meaning States'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Toggle keep-learning on a meaning' }),
    ApiParam({ name: 'meaningId', type: String }),
    ApiResponse({
      status: 200,
      schema: SuccessSchema(UserMeaningStateSchema),
    }),
    ApiResponse({ status: 404, schema: MeaningNotFoundError }),
    ...BASE_ERRORS.map((e) => ApiResponse(e)),
  );
}
