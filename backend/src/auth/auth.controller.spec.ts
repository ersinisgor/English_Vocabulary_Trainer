import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { AuthenticatedRequest } from './types/interfaces/authenticated-request.interface';
import { RequestWithCookies } from './types/interfaces/auth-request-with-cookies.interface';
import { Role, User } from 'generated/prisma';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hashed-password',
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockResponse = (): Partial<Response> => ({
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            register: jest.fn(),
            refresh: jest.fn(),
            logout: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                'jwt.refreshExpiresIn': '7d',
                environment: 'development',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return access token and set refresh cookie', async () => {
      const req = {
        user: mockUser,
      } as AuthenticatedRequest;
      const res = mockResponse() as Response;

      authService.login.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const result = await controller.login(req, res);

      expect(result).toEqual({ accessToken: 'access-token' });
      expect(authService.login).toHaveBeenCalledWith(mockUser);
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        }),
      );
    });

    it('should set secure cookie in production', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'jwt.refreshExpiresIn') return '7d';
        if (key === 'environment') return 'production';
        return undefined;
      });

      const req = { user: mockUser } as AuthenticatedRequest;
      const res = mockResponse() as Response;

      authService.login.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      await controller.login(req, res);

      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh-token',
        expect.objectContaining({
          secure: true,
        }),
      );
    });

    it('should not set secure cookie in development', async () => {
      const req = { user: mockUser } as AuthenticatedRequest;
      const res = mockResponse() as Response;

      authService.login.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      await controller.login(req, res);

      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh-token',
        expect.objectContaining({
          secure: false,
        }),
      );
    });

    it('should calculate correct cookie maxAge', async () => {
      const req = { user: mockUser } as AuthenticatedRequest;
      const res = mockResponse() as Response;

      authService.login.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      await controller.login(req, res);

      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh-token',
        expect.objectContaining({
          maxAge: 604800000, // 7 days in ms
        }),
      );
    });
  });

  describe('register', () => {
    const registerDTO = {
      email: 'newuser@example.com',
      password: 'Password123!',
      username: 'newuser',
    };

    it('should register a new user', async () => {
      authService.register.mockResolvedValue(mockUser);

      const result = await controller.register(registerDTO);

      expect(result).toEqual(mockUser);
      expect(authService.register).toHaveBeenCalledWith(registerDTO);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Registration failed');
      authService.register.mockRejectedValue(error);

      await expect(controller.register(registerDTO)).rejects.toThrow(
        'Registration failed',
      );
    });
  });

  describe('getProfile', () => {
    it('should return the authenticated user', () => {
      const req = {
        user: mockUser,
      } as AuthenticatedRequest;

      const result = controller.getProfile(req);

      expect(result).toEqual(mockUser);
    });

    it('should return user with all properties', () => {
      const req = {
        user: mockUser,
      } as AuthenticatedRequest;

      const result = controller.getProfile(req);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('username');
      expect(result).toHaveProperty('role');
    });
  });

  describe('refresh', () => {
    const res = mockResponse() as Response;

    it('should refresh using cookie token', async () => {
      const req = {
        cookies: {
          refreshToken: 'cookie-refresh-token',
        },
      } as RequestWithCookies;

      authService.refresh.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const result = await controller.refresh(req, res, {
        refreshToken: 'body-token',
      });

      expect(result).toEqual({ accessToken: 'new-access-token' });
      expect(authService.refresh).toHaveBeenCalledWith('cookie-refresh-token');
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'new-refresh-token',
        expect.any(Object),
      );
    });

    it('should refresh using body token if cookie not present', async () => {
      const req = {
        cookies: {},
      } as RequestWithCookies;

      authService.refresh.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const result = await controller.refresh(req, res, {
        refreshToken: 'body-refresh-token',
      });

      expect(result).toEqual({ accessToken: 'new-access-token' });
      expect(authService.refresh).toHaveBeenCalledWith('body-refresh-token');
    });

    it('should prioritize cookie token over body token', async () => {
      const req = {
        cookies: {
          refreshToken: 'cookie-token',
        },
      } as RequestWithCookies;

      authService.refresh.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      await controller.refresh(req, res, {
        refreshToken: 'body-token',
      });

      expect(authService.refresh).toHaveBeenCalledWith('cookie-token');
      expect(authService.refresh).not.toHaveBeenCalledWith('body-token');
    });

    it('should throw UnauthorizedException if no token provided', async () => {
      const req = {
        cookies: {},
      } as RequestWithCookies;

      await expect(
        controller.refresh(req, res, { refreshToken: undefined }),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        controller.refresh(req, res, { refreshToken: undefined }),
      ).rejects.toThrow('Refresh token missing');
    });

    it('should set new refresh cookie after successful refresh', async () => {
      const req = {
        cookies: {
          refreshToken: 'old-token',
        },
      } as RequestWithCookies;

      authService.refresh.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      await controller.refresh(req, res, { refreshToken: undefined });

      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'new-refresh-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        }),
      );
    });

    it('should handle undefined cookies object', async () => {
      const req = {} as RequestWithCookies;

      await expect(
        controller.refresh(req, res, { refreshToken: undefined }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should handle empty string refresh token', async () => {
      const req = {
        cookies: {},
      } as RequestWithCookies;

      await expect(
        controller.refresh(req, res, { refreshToken: '' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    const res = mockResponse() as Response;

    it('should logout using cookie token', async () => {
      const req = {
        cookies: {
          refreshToken: 'cookie-refresh-token',
        },
      } as RequestWithCookies;

      await controller.logout(req, res, { refreshToken: undefined });

      expect(authService.logout).toHaveBeenCalledWith('cookie-refresh-token');
      expect(res.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        }),
      );
    });

    it('should logout using body token if cookie not present', async () => {
      const req = {
        cookies: {},
      } as RequestWithCookies;

      await controller.logout(req, res, {
        refreshToken: 'body-refresh-token',
      });

      expect(authService.logout).toHaveBeenCalledWith('body-refresh-token');
      expect(res.clearCookie).toHaveBeenCalled();
    });

    it('should prioritize cookie token over body token', async () => {
      const req = {
        cookies: {
          refreshToken: 'cookie-token',
        },
      } as RequestWithCookies;

      await controller.logout(req, res, {
        refreshToken: 'body-token',
      });

      expect(authService.logout).toHaveBeenCalledWith('cookie-token');
      expect(authService.logout).not.toHaveBeenCalledWith('body-token');
    });

    it('should clear cookie even if no token provided', async () => {
      const req = {
        cookies: {},
      } as RequestWithCookies;

      await controller.logout(req, res, { refreshToken: undefined });

      expect(authService.logout).not.toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
      });
    });

    it('should clear secure cookie in production', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'environment') return 'production';
        return undefined;
      });

      const req = {
        cookies: {},
      } as RequestWithCookies;

      await controller.logout(req, res, { refreshToken: undefined });

      expect(res.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.objectContaining({
          secure: true,
        }),
      );
    });

    it('should not return anything (void)', async () => {
      const req = {
        cookies: {
          refreshToken: 'token',
        },
      } as RequestWithCookies;

      const result = await controller.logout(req, res, {
        refreshToken: undefined,
      });

      expect(result).toBeUndefined();
    });

    it('should handle undefined cookies object', async () => {
      const req = {} as RequestWithCookies;

      await controller.logout(req, res, { refreshToken: undefined });

      expect(res.clearCookie).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should propagate auth service errors in login', async () => {
      const req = { user: mockUser } as AuthenticatedRequest;
      const res = mockResponse() as Response;
      const error = new Error('Service error');

      authService.login.mockRejectedValue(error);

      await expect(controller.login(req, res)).rejects.toThrow('Service error');
    });

    it('should propagate auth service errors in refresh', async () => {
      const req = {
        cookies: { refreshToken: 'token' },
      } as RequestWithCookies;
      const res = mockResponse() as Response;
      const error = new UnauthorizedException('Invalid token');

      authService.refresh.mockRejectedValue(error);

      await expect(
        controller.refresh(req, res, { refreshToken: undefined }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
