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
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  username?: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
