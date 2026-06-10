import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateWordListDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  folderId?: string;
}
