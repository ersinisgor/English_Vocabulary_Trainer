import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateWordListDTO {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  // null clears the folder (moves list to "no folder"), string moves it.
  @IsOptional()
  @IsString()
  folderId?: string | null;
}
