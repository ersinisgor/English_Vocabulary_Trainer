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
import { FolderSchema } from './folders.schemas';

const TAG = 'Folders';

const BASE_ERRORS = [
  { status: 401, schema: UnauthorizedError },
  { status: 500, schema: InternalServerError },
];

export const FolderNotFoundError = BaseErrorSchema(
  404,
  'Folder not found',
  'Not Found',
);

export const FolderConflictError = BaseErrorSchema(
  409,
  'A folder named "Academic Vocabulary" already exists.',
  'Conflict',
);

export function ApiCreateFolder() {
  return applyDecorators(
    ApiTags(TAG),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Create a new folder' }),
    ApiResponse({ status: 201, schema: SuccessSchema(FolderSchema) }),
    ApiResponse({ status: 400, schema: ValidationError }),
    ApiResponse({ status: 409, schema: FolderConflictError }),
    ...BASE_ERRORS.map((e) => ApiResponse(e)),
  );
}

export function ApiGetFolders() {
  return applyDecorators(
    ApiTags(TAG),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get all folders for the authenticated user' }),
    ApiResponse({
      status: 200,
      schema: SuccessSchema({ type: 'array', items: FolderSchema }),
    }),
    ...BASE_ERRORS.map((e) => ApiResponse(e)),
  );
}

export function ApiGetFolderById() {
  return applyDecorators(
    ApiTags(TAG),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get a folder by id' }),
    ApiParam({ name: 'id', type: String }),
    ApiResponse({ status: 200, schema: SuccessSchema(FolderSchema) }),
    ApiResponse({ status: 404, schema: FolderNotFoundError }),
    ...BASE_ERRORS.map((e) => ApiResponse(e)),
  );
}

export function ApiUpdateFolder() {
  return applyDecorators(
    ApiTags(TAG),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Update a folder' }),
    ApiParam({ name: 'id', type: String }),
    ApiResponse({ status: 200, schema: SuccessSchema(FolderSchema) }),
    ApiResponse({ status: 404, schema: FolderNotFoundError }),
    ApiResponse({ status: 409, schema: FolderConflictError }),
    ...BASE_ERRORS.map((e) => ApiResponse(e)),
  );
}

export function ApiDeleteFolder() {
  return applyDecorators(
    ApiTags(TAG),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Delete a folder' }),
    ApiParam({ name: 'id', type: String }),
    ApiResponse({ status: 200, schema: SuccessSchema(FolderSchema) }),
    ApiResponse({ status: 404, schema: FolderNotFoundError }),
    ...BASE_ERRORS.map((e) => ApiResponse(e)),
  );
}
