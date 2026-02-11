import { PartialType } from '@nestjs/swagger';
import { CreateWordDTO } from './create-word.dto';

export class UpdateWordDTO extends PartialType(CreateWordDTO) {}
