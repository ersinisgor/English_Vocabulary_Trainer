import { PartialType } from '@nestjs/swagger';
import { CreateFolderDTO } from './create-folder.dto';

export class UpdateFolderDTO extends PartialType(CreateFolderDTO) {}
