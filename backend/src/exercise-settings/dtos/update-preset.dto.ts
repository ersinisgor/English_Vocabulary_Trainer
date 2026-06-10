import { PartialType } from '@nestjs/swagger';
import { CreatePresetDTO } from './create-preset.dto';

export class UpdatePresetDTO extends PartialType(CreatePresetDTO) {}
