import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class RegisterResponseDTO {
  @Expose()
  @ApiProperty({ example: 'clu278fem0000c9nbwq3x7m7v' })
  id: string;

  @Expose()
  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @Expose()
  @ApiProperty({
    example: 'johnny',
    nullable: true,
    description: 'Optional username',
  })
  username: string | null;
}
