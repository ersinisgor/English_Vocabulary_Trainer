import { Body, Controller, Post } from '@nestjs/common';
import { LoginDTO } from './dtos/login.dto';
import { LoginResponseDTO } from './dtos/login-response.dto';
import { AuthService } from './auth.service';
import { RegisterDTO } from './dtos/register.dto';
import { RegisterResponseDTO } from './dtos/register-response.dto';
import { Serialize } from 'src/common/decorators/serilaize.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDTO: LoginDTO): Promise<LoginResponseDTO> {
    return await this.authService.login(loginDTO);
  }

  @Post('register')
  @Serialize(RegisterResponseDTO)
  async register(@Body() registerDTO: RegisterDTO) {
    return await this.authService.register(registerDTO);
  }
}
