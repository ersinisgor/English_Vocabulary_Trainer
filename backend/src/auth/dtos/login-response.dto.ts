import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDTO {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token, used in Authorization header',
  })
  accessToken: string;

  // refreshToken may be returned for non-browser clients; with cookie flows you don't need it in JSON
  @ApiProperty({
    example: 'clu278fem0000c9nbwq3x7m7v.a92b1c3f8...',
    required: false,
    nullable: true,
    description:
      'Refresh token used only for non-browser clients. Normally sent via HttpOnly cookie.',
  })
  refreshToken?: string;
}
