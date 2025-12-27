import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AuthCreateUserDTO {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  username?: string;

  @IsString()
  @MinLength(8)
  password: string;
}
