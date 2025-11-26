import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LogoutDTO {
  @ApiProperty({
    required: false,
    nullable: true,
    example: 'clu278fem0000c9nbwq3x7m7v.abcd1234...',
    description:
      'Refresh token to revoke. Optional because refresh token cookie may exist.',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
