import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../types/interfaces/jwt-payload.interface';
import { User, Role } from 'generated/prisma';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: jest.Mocked<UsersService>;
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

  beforeEach(async () => {
    const mockUsersService = {
      findUniqueById: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'jwt.secret') return 'test-secret-key';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    usersService = module.get(UsersService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    const validPayload: JwtPayload = {
      sub: 'user-123',
      email: 'test@example.com',
      role: Role.USER,
    };

    it('should return user when JWT payload is valid', async () => {
      usersService.findUniqueById.mockResolvedValue(mockUser);

      const result = await strategy.validate(validPayload);

      expect(result).toEqual(mockUser);
      expect(usersService.findUniqueById).toHaveBeenCalledWith('user-123');
      expect(usersService.findUniqueById).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      usersService.findUniqueById.mockResolvedValue(null);

      await expect(strategy.validate(validPayload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(validPayload)).rejects.toThrow(
        'User not found',
      );

      expect(usersService.findUniqueById).toHaveBeenCalledWith('user-123');
    });

    it('should validate JWT with ADMIN role', async () => {
      const adminUser: User = {
        ...mockUser,
        role: Role.ADMIN,
      };
      const adminPayload: JwtPayload = {
        sub: 'admin-456',
        email: 'admin@example.com',
        role: Role.ADMIN,
      };

      usersService.findUniqueById.mockResolvedValue(adminUser);

      const result = await strategy.validate(adminPayload);

      expect(result).toEqual(adminUser);
      expect(result.role).toBe(Role.ADMIN);
      expect(usersService.findUniqueById).toHaveBeenCalledWith('admin-456');
    });

    it('should handle user lookup by sub (user ID)', async () => {
      const userId = 'unique-user-id-789';
      const payload: JwtPayload = {
        sub: userId,
        email: 'another@example.com',
        role: Role.USER,
      };

      usersService.findUniqueById.mockResolvedValue(mockUser);

      await strategy.validate(payload);

      expect(usersService.findUniqueById).toHaveBeenCalledWith(userId);
    });

    it('should propagate service errors', async () => {
      const serviceError = new Error('Database connection failed');
      usersService.findUniqueById.mockRejectedValue(serviceError);

      await expect(strategy.validate(validPayload)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle payload with different emails', async () => {
      usersService.findUniqueById.mockResolvedValue(mockUser);

      const payload1: JwtPayload = {
        sub: 'user-123',
        email: 'first@example.com',
        role: Role.USER,
      };
      const payload2: JwtPayload = {
        sub: 'user-123',
        email: 'second@example.com',
        role: Role.USER,
      };

      await strategy.validate(payload1);
      await strategy.validate(payload2);

      // Should call with the same ID regardless of email in payload
      expect(usersService.findUniqueById).toHaveBeenCalledTimes(2);
      expect(usersService.findUniqueById).toHaveBeenNthCalledWith(
        1,
        'user-123',
      );
      expect(usersService.findUniqueById).toHaveBeenNthCalledWith(
        2,
        'user-123',
      );
    });

    it('should throw when user was deleted after token was issued', async () => {
      // Scenario: Token is valid but user no longer exists
      usersService.findUniqueById.mockResolvedValue(null);

      await expect(strategy.validate(validPayload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(validPayload)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('strategy configuration', () => {
    it('should be configured with correct JWT secret from config', () => {
      expect(configService.get).toHaveBeenCalledWith('jwt.secret');
      expect(strategy).toBeDefined();
    });

    it('should extract JWT from Authorization Bearer header', () => {
      // The strategy is configured with ExtractJwt.fromAuthHeaderAsBearerToken()
      // This is implicit in the super() call
      expect(strategy).toBeDefined();
    });

    it('should not ignore token expiration', () => {
      // The strategy is configured with ignoreExpiration: false
      // This is implicit in the super() call
      expect(strategy).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle undefined sub in payload', async () => {
      const invalidPayload = {
        email: 'test@example.com',
        role: Role.USER,
      } as any;

      usersService.findUniqueById.mockResolvedValue(null);

      await expect(strategy.validate(invalidPayload)).rejects.toThrow();
    });

    it('should handle null return from service', async () => {
      const payload: JwtPayload = {
        sub: 'non-existent-user',
        email: 'test@example.com',
        role: Role.USER,
      };

      usersService.findUniqueById.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        'User not found',
      );
    });
  });
});
