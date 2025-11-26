import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDTO {
  @ApiProperty({
    required: false,
    nullable: true,
    example: 'clu278fem0000c9nbwq3x7m7v.12ab34cd...',
    description:
      'Refresh token. Optional because cookie-based refresh is preferred.',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string; // optional; cookie is preferred
}
