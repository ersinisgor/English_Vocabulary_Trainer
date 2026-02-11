import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDTO {
  @IsOptional()
  @IsString()
  refreshToken?: string; // optional; cookie is preferred
}
