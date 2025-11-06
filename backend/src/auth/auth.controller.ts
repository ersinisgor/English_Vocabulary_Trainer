import { Body, Controller, Post } from '@nestjs/common';
import { LoginDTO } from './dtos/login.dto';
import { LoginResponseDTO } from './dtos/login-response.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  async login(@Body() loginDTO: LoginDTO): Promise<LoginResponseDTO> {
    return await this.authService.login(loginDTO);
  }
}
