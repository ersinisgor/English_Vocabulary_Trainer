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
import { PresetSchema } from './exercise-settings.schemas';

const TAG = 'Exercise Settings';

const BASE_ERRORS = [
  { status: 401, schema: UnauthorizedError },
  { status: 500, schema: InternalServerError },
];

export const PresetNotFoundError = BaseErrorSchema(
  404,
  'Exercise settings preset not found',
  'Not Found',
);

export function ApiCreatePreset() {
  return applyDecorators(
    ApiTags(TAG),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Create an exercise settings preset' }),
    ApiResponse({ status: 201, schema: SuccessSchema(PresetSchema) }),
    ApiResponse({ status: 400, schema: ValidationError }),
    ...BASE_ERRORS.map((e) => ApiResponse(e)),
  );
}

export function ApiGetPresets() {
  return applyDecorators(
    ApiTags(TAG),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get all presets for the authenticated user' }),
    ApiResponse({
      status: 200,
      schema: SuccessSchema({ type: 'array', items: PresetSchema }),
    }),
    ...BASE_ERRORS.map((e) => ApiResponse(e)),
  );
}

export function ApiGetPresetById() {
  return applyDecorators(
    ApiTags(TAG),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get a preset by id' }),
    ApiParam({ name: 'id', type: String }),
    ApiResponse({ status: 200, schema: SuccessSchema(PresetSchema) }),
    ApiResponse({ status: 404, schema: PresetNotFoundError }),
    ...BASE_ERRORS.map((e) => ApiResponse(e)),
  );
}

export function ApiUpdatePreset() {
  return applyDecorators(
    ApiTags(TAG),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Update a preset' }),
    ApiParam({ name: 'id', type: String }),
    ApiResponse({ status: 200, schema: SuccessSchema(PresetSchema) }),
    ApiResponse({ status: 404, schema: PresetNotFoundError }),
    ...BASE_ERRORS.map((e) => ApiResponse(e)),
  );
}

export function ApiDeletePreset() {
  return applyDecorators(
    ApiTags(TAG),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Delete a preset' }),
    ApiParam({ name: 'id', type: String }),
    ApiResponse({ status: 200, schema: SuccessSchema(PresetSchema) }),
    ApiResponse({ status: 404, schema: PresetNotFoundError }),
    ...BASE_ERRORS.map((e) => ApiResponse(e)),
  );
}
