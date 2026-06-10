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
import { ExerciseSettingsService } from './exercise-settings.service';
import { CreatePresetDTO } from './dtos/create-preset.dto';
import { UpdatePresetDTO } from './dtos/update-preset.dto';
import { PresetResponseDTO } from './dtos/preset-response.dto';
import { AuthenticatedRequest } from 'src/auth/types/interfaces/authenticated-request.interface';
import { Serialize } from 'src/common/decorators/serialize.decorator';
import {
  ApiCreatePreset,
  ApiGetPresets,
  ApiGetPresetById,
  ApiUpdatePreset,
  ApiDeletePreset,
} from 'src/common/swagger';

@Controller('exercise-settings')
@Serialize(PresetResponseDTO)
export class ExerciseSettingsController {
  constructor(private readonly service: ExerciseSettingsService) {}

  @Post()
  @ApiCreatePreset()
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreatePresetDTO) {
    return this.service.create(req.user.id, dto);
  }

  @Get()
  @ApiGetPresets()
  async findAll(@Req() req: AuthenticatedRequest) {
    return this.service.findAll(req.user.id);
  }

  @Get(':id')
  @ApiGetPresetById()
  async findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.findOne(req.user.id, id);
  }

  @Patch(':id')
  @ApiUpdatePreset()
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdatePresetDTO,
  ) {
    return this.service.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiDeletePreset()
  async remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }
}
