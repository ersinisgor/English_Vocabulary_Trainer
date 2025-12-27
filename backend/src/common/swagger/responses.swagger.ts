import { ApiProperty } from '@nestjs/swagger';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

export class ErrorResponse {
  @ApiProperty({ example: 401 })
  statusCode: number;

  @ApiProperty({ example: 'Unauthorized' })
  message: string;
}

/**
 * Generic success wrapper (documentation-only)
 */
export class SuccessResponse<T> {
  @ApiProperty({ example: true })
  success: boolean;

  data: T;
}

/**
 * Swagger schema helper for SuccessResponse<T>
 */
export const SuccessSchema = (dataSchema: SchemaObject): SchemaObject => ({
  type: 'object',
  properties: {
    success: {
      type: 'boolean',
      example: true,
    },
    data: dataSchema,
  },
  required: ['success', 'data'],
});
