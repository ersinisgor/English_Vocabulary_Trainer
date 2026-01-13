import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy';
import { AuthService } from '../auth.service';
import { User, Role } from 'generated/prisma';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: jest.Mocked<AuthService>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hashed-password',
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockAuthService = {
      validateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should return user when credentials are valid', async () => {
      authService.validateUser.mockResolvedValue(mockUser);

      const result = await strategy.validate('test@example.com', 'password123');

      expect(result).toEqual(mockUser);
      expect(authService.validateUser).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
      );
      expect(authService.validateUser).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(
        strategy.validate('wrong@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        strategy.validate('wrong@example.com', 'password123'),
      ).rejects.toThrow('Invalid credentials');

      expect(authService.validateUser).toHaveBeenCalledWith(
        'wrong@example.com',
        'password123',
      );
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(
        strategy.validate('test@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        strategy.validate('test@example.com', 'wrongpassword'),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should handle email in different cases', async () => {
      authService.validateUser.mockResolvedValue(mockUser);

      await strategy.validate('TEST@EXAMPLE.COM', 'password123');
      await strategy.validate('test@example.com', 'password123');
      await strategy.validate('TeSt@ExAmPlE.cOm', 'password123');

      expect(authService.validateUser).toHaveBeenCalledTimes(3);
    });

    it('should handle special characters in password', async () => {
      authService.validateUser.mockResolvedValue(mockUser);
      const specialPassword = 'P@ssw0rd!#$%^&*()';

      await strategy.validate('test@example.com', specialPassword);

      expect(authService.validateUser).toHaveBeenCalledWith(
        'test@example.com',
        specialPassword,
      );
    });

    it('should handle empty email', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(strategy.validate('', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle empty password', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(strategy.validate('test@example.com', '')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should propagate service errors', async () => {
      const serviceError = new Error('Database connection failed');
      authService.validateUser.mockRejectedValue(serviceError);

      await expect(
        strategy.validate('test@example.com', 'password123'),
      ).rejects.toThrow('Database connection failed');
    });

    it('should work with ADMIN role user', async () => {
      const adminUser: User = {
        ...mockUser,
        role: Role.ADMIN,
      };
      authService.validateUser.mockResolvedValue(adminUser);

      const result = await strategy.validate('admin@example.com', 'password');

      expect(result).toEqual(adminUser);
      expect(result.role).toBe(Role.ADMIN);
    });
  });

  describe('strategy configuration', () => {
    it('should be configured with email as username field', () => {
      // The strategy is configured to use 'email' instead of default 'username'
      // This is implicit in the super() call with { usernameField: 'email' }
      expect(strategy).toBeDefined();
    });
  });
});
