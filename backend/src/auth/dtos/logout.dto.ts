import { IsOptional, IsString } from 'class-validator';

export class LogoutDTO {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
