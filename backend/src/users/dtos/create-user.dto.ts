import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { Role } from 'generated/prisma';

export class CreateUserDTO {
  @ApiProperty({
    example: 'john@example.com',
    description: 'Unique email address of the user',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    example: 'johnny',
    description: 'Optional username',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  username?: string;

  @ApiProperty({
    example: 'StrongP@ssw0rd',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: Role, description: 'ADMIN only field' })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
