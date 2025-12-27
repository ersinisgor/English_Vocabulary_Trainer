import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { LoginResponseDTO } from './dtos/login-response.dto';
import { AuthService } from './auth.service';
import { RegisterDTO } from './dtos/register.dto';
import { RegisterResponseDTO } from './dtos/register-response.dto';
import { Serialize } from 'src/common/decorators/serialize.decorator';
import { Response } from 'express';
import { AuthenticatedRequest } from './types/interfaces/authenticated-request.interface';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenDTO } from './dtos/refresh-token.dto';
import { LogoutDTO } from './dtos/logout.dto';
import { RequestWithCookies } from './types/interfaces/auth-request-with-cookies.interface';
import { buildRefreshCookieOptions } from 'src/common/utils/cookie.utils';
import { REFRESH_COOKIE_NAME } from 'src/common/constants/auth.constants';
import { isProductionEnv } from 'src/common/utils/env.utils';
import { Public } from 'src/common/decorators/public.decorator';
import { LocalAuthGuard } from './guards/local-auth.guard';
import {
  ApiLogin,
  ApiRegister,
  ApiGetMe,
  ApiRefresh,
  ApiLogout,
} from 'src/common/swagger';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiLogin()
  async login(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDTO> {
    const { accessToken, refreshToken } = await this.authService.login(
      req.user,
    );

    const cookieOptions = buildRefreshCookieOptions(
      this.configService.get<string>('jwt.refreshExpiresIn', '7d'),
      isProductionEnv(this.configService),
    );
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);

    return { accessToken };
  }

  @Public()
  @Post('register')
  @Serialize(RegisterResponseDTO)
  @ApiRegister()
  async register(@Body() registerDTO: RegisterDTO) {
    return await this.authService.register(registerDTO);
  }

  @Get('me')
  @Serialize(RegisterResponseDTO)
  @ApiGetMe()
  getProfile(@Req() req: AuthenticatedRequest) {
    return req.user;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiRefresh()
  async refresh(
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
    @Body() refreshTokenDTO: RefreshTokenDTO,
  ) {
    // prefer cookie
    const cookieToken = req.cookies?.[REFRESH_COOKIE_NAME];
    const incoming = cookieToken ?? refreshTokenDTO.refreshToken;
    if (!incoming) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const { accessToken, refreshToken } =
      await this.authService.refresh(incoming);

    // set new refresh cookie
    const cookieOptions = buildRefreshCookieOptions(
      this.configService.get<string>('jwt.refreshExpiresIn', '7d'),
      isProductionEnv(this.configService),
    );
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);

    return { accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiLogout()
  async logout(
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
    @Body() logoutDTO: LogoutDTO,
  ): Promise<void> {
    const cookieToken = req.cookies?.[REFRESH_COOKIE_NAME];
    const incoming = cookieToken ?? logoutDTO.refreshToken;

    if (incoming) {
      await this.authService.logout(incoming);
    }

    // clear refresh cookie
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: isProductionEnv(this.configService),
      sameSite: 'lax',
      path: '/',
    });
  }
}
