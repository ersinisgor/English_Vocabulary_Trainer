import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateFolderDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
