import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { LoginDTO } from './dtos/login.dto';
import { LoginResponseDTO } from './dtos/login-response.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './types/interfaces/jwt-payload.interface';
import { RegisterDTO } from './dtos/register.dto';
import { RegisterResponseDTO } from './dtos/register-response.dto';
import { CreateUserDto } from 'src/users/dtos/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  private saltRounds: number = 10;

  async login(loginDTO: LoginDTO): Promise<LoginResponseDTO> {
    const { password, email } = loginDTO;

    const user = await this.usersService.findUniqueByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const token = await this.generateToken(payload);

    return token;
  }

  async register(registerDTO: RegisterDTO): Promise<RegisterResponseDTO> {
    const { password, email, username } = registerDTO;

    const user = await this.usersService.findUniqueByEmail(email);
    if (user) {
      throw new ConflictException(
        `User with ${email} email address already exists`,
      );
    }

    const passwordHash = await bcrypt.hash(password, this.saltRounds);

    const userData: CreateUserDto = {
      email,
      password: passwordHash,
      username,
    };

    const createdUser = await this.usersService.create(userData);
    return createdUser;
  }

  private async generateToken(payload: JwtPayload): Promise<LoginResponseDTO> {
    return {
      accessToken: await this.jwtService.signAsync(payload),
    };
  }
}
