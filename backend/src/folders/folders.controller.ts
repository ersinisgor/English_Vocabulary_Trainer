import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { FoldersService } from './folders.service';
import { CreateFolderDTO } from './dtos/create-folder.dto';
import { UpdateFolderDTO } from './dtos/update-folder.dto';
import { FolderResponseDTO } from './dtos/folder-response.dto';
import { AuthenticatedRequest } from 'src/auth/types/interfaces/authenticated-request.interface';
import { Serialize } from 'src/common/decorators/serialize.decorator';
import {
  ApiCreateFolder,
  ApiGetFolders,
  ApiGetFolderById,
  ApiUpdateFolder,
  ApiDeleteFolder,
} from 'src/common/swagger';

@Controller('folders')
@Serialize(FolderResponseDTO)
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  @ApiCreateFolder()
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateFolderDTO) {
    return this.foldersService.create(req.user.id, dto);
  }

  @Get()
  @ApiGetFolders()
  async findAll(@Req() req: AuthenticatedRequest) {
    return this.foldersService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiGetFolderById()
  async findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.foldersService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @ApiUpdateFolder()
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateFolderDTO,
  ) {
    return this.foldersService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiDeleteFolder()
  async remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.foldersService.remove(req.user.id, id);
  }
}
