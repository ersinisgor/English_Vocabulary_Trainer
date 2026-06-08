import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  SuccessSchema,
  UnauthorizedError,
  FileRequiredError,
  InvalidFileTypeError,
  InternalServerError,
} from '../responses.swagger';
import { FileUploadSchema, ImportResponseSchema } from './import.schemas';

const IMPORT_ERRORS = [
  { status: 401, schema: UnauthorizedError },
  { status: 500, schema: InternalServerError },
];

export function ApiImportWords() {
  return applyDecorators(
    ApiTags('Import'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Import words from Excel file',
      description:
        'Upload an Excel file (.xlsx, .xls) or CSV file containing words, meanings, examples, and tags. ' +
        'The file must have 3 sheets: Words-WordMeaning, ExampleSentence, and WordTag.',
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      description: 'Upload Excel file (.xlsx, .xls) or CSV file',
      schema: FileUploadSchema,
    }),
    ApiResponse({
      status: 200,
      description: 'Words imported successfully',
      schema: SuccessSchema(ImportResponseSchema),
    }),
    ApiResponse({ status: 400, schema: FileRequiredError }),
    ApiResponse({ status: 400, schema: InvalidFileTypeError }),
    ...IMPORT_ERRORS.map((e) => ApiResponse(e)),
  );
}
