import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { Role } from 'generated/prisma';

@Exclude()
export class UserResponseDto {
  @Expose()
  @ApiProperty({ example: 'clu278fem0000c9nbwq3x7m7v' })
  id: string;

  @Expose()
  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @Expose()
  @ApiProperty({
    nullable: true,
    example: 'johnny',
  })
  username: string | null;

  @Expose()
  @ApiProperty({
    nullable: true,
  })
  role: Role | null;

  @Expose()
  @ApiProperty({ example: '2025-01-01T12:00:00.000Z' })
  createdAt: Date;

  @Expose()
  @ApiProperty({ example: '2025-01-02T14:20:00.000Z' })
  updatedAt: Date;
}
