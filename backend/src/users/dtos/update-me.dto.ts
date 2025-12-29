import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMeDTO {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
