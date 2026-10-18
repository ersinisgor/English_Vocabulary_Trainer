import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  SuccessSchema,
  UnauthorizedError,
  InternalServerError,
} from '../responses.swagger';

const TagSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string', example: 'clt1abc123' },
    name: { type: 'string', example: 'business' },
  },
};

export function ApiGetTags() {
  return applyDecorators(
    ApiTags('Tags'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get all tags used by the authenticated user' }),
    ApiResponse({
      status: 200,
      schema: SuccessSchema({ type: 'array', items: TagSchema }),
    }),
    ApiResponse({ status: 401, schema: UnauthorizedError }),
    ApiResponse({ status: 500, schema: InternalServerError }),
  );
}
