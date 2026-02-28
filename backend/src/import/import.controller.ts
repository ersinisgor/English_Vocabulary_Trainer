import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService } from './import.service';
import { AuthenticatedRequest } from 'src/auth/types/interfaces/authenticated-request.interface';
import { Serialize } from 'src/common/decorators/serialize.decorator';
import { ImportResponseDTO } from './dtos/import-response.dto';
import { ApiTags } from '@nestjs/swagger';
import { ApiImportWords } from 'src/common/swagger';

@ApiTags('import')
@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('words')
  @Serialize(ImportResponseDTO)
  @ApiImportWords()
  @UseInterceptors(FileInterceptor('file'))
  async importWords(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Validate file type
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only Excel (.xlsx) and CSV files are allowed.',
      );
    }

    // Validate file extension
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf('.'));

    if (!allowedExtensions.includes(fileExtension)) {
      throw new BadRequestException(
        'Invalid file extension. Only .xlsx, .xls, and .csv files are allowed.',
      );
    }

    // Parse Excel file
    const excelData = await this.importService.parseExcelFile(file.buffer);

    // Import data
    const result = await this.importService.importFromExcel(
      req.user.id,
      excelData,
    );

    return result;
  }
}
