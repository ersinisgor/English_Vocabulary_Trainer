import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from 'generated/prisma';

export class UpdateUserDTO {
  @ApiPropertyOptional({
    example: 'newmail@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: 'newusername',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  username?: string;

  @ApiPropertyOptional({
    example: 'NewStrongP@ssw0rd',
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({
    enum: Role,
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
