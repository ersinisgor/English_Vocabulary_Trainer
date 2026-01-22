import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role, User } from 'generated/prisma';
import * as bcrypt from 'bcrypt';
import { Prisma } from 'generated/prisma';

jest.mock('bcrypt');
jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('a'.repeat(96)),
  }),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  // let prisma: jest.Mocked<PrismaService>;
  // let configService: jest.Mocked<ConfigService>;

  type PrismaMock = {
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const prismaMock: PrismaMock = {
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  let prisma: typeof prismaMock;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hashed-password',
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRefreshToken = {
    id: 'token-123',
    tokenHash: 'hashed-token',
    userId: 'user-123',
    expiresAt: new Date(Date.now() + 86400000),
    createdAt: new Date(),
    revoked: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findUniqueByEmail: jest.fn(),
            findUniqueById: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              const config: Record<string, unknown> = {
                'bcrypt.saltRounds': 4,
                'jwt.refreshExpiresIn': '7d',
                'jwt.secret': 'test-secret',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    prisma = prismaMock;
    // configService = module.get(ConfigService);

    // Reset bcrypt mocks
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-value');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return access token and refresh token', async () => {
      jwtService.signAsync.mockResolvedValue('access-token');
      prisma.refreshToken.create.mockResolvedValue(mockRefreshToken);

      const result = await service.login(mockUser);

      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('refreshToken');
      expect(jest.spyOn(jwtService, 'signAsync')).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it('should create JWT with correct payload', async () => {
      jwtService.signAsync.mockResolvedValue('access-token');
      prisma.refreshToken.create.mockResolvedValue(mockRefreshToken);

      await service.login(mockUser);

      expect(jest.spyOn(jwtService, 'signAsync')).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });

    it('should generate refresh token for user', async () => {
      jwtService.signAsync.mockResolvedValue('access-token');
      prisma.refreshToken.create.mockResolvedValue(mockRefreshToken);

      await service.login(mockUser);

      expect(prisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            userId: mockUser.id,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            tokenHash: expect.any(String),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            expiresAt: expect.any(Date),
          }),
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

    it('should register a new user successfully', async () => {
      usersService.findUniqueByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await service.register(registerDTO);

      expect(result).toEqual(mockUser);
      expect(
        jest.spyOn(usersService, 'findUniqueByEmail'),
      ).toHaveBeenCalledWith(registerDTO.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDTO.password, 4);
      expect(jest.spyOn(usersService, 'create')).toHaveBeenCalledWith({
        email: registerDTO.email,
        password: 'hashed-password',
        username: registerDTO.username,
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      usersService.findUniqueByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDTO)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDTO)).rejects.toThrow(
        `User with ${registerDTO.email} email address already exists`,
      );

      expect(jest.spyOn(usersService, 'create')).not.toHaveBeenCalled();
    });

    it('should handle Prisma unique constraint error (P2002)', async () => {
      usersService.findUniqueByEmail.mockResolvedValue(null);

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0' },
      );

      usersService.create.mockRejectedValue(prismaError);

      await expect(service.register(registerDTO)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDTO)).rejects.toThrow(
        'User with given email already exists',
      );
    });

    it('should propagate other errors', async () => {
      usersService.findUniqueByEmail.mockResolvedValue(null);
      const error = new Error('Database error');
      usersService.create.mockRejectedValue(error);

      await expect(service.register(registerDTO)).rejects.toThrow(
        'Database error',
      );
    });

    it('should hash password before saving', async () => {
      usersService.findUniqueByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('super-secure-hash');

      await service.register(registerDTO);

      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 4);
      expect(jest.spyOn(usersService, 'create')).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'super-secure-hash',
        }),
      );
    });
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      usersService.findUniqueByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toEqual(mockUser);
      expect(
        jest.spyOn(usersService, 'findUniqueByEmail'),
      ).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password',
        mockUser.passwordHash,
      );
    });

    it('should return null when user not found', async () => {
      usersService.findUniqueByEmail.mockResolvedValue(null);

      const result = await service.validateUser(
        'nonexistent@example.com',
        'password',
      );

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null when password is incorrect', async () => {
      usersService.findUniqueByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(
        'test@example.com',
        'wrongpassword',
      );

      expect(result).toBeNull();
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate and store refresh token', async () => {
      prisma.refreshToken.create.mockResolvedValue(mockRefreshToken);

      const result = await service.generateRefreshToken('user-123');

      expect(result).toHaveProperty('compositeToken');
      expect(result).toHaveProperty('created');

      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          tokenHash: expect.any(String),
          userId: 'user-123',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          expiresAt: expect.any(Date),
        },
      });
    });

    it('should create composite token with id and raw', async () => {
      prisma.refreshToken.create.mockResolvedValue(mockRefreshToken);

      const result = await service.generateRefreshToken('user-123');

      expect(result.compositeToken).toContain('.');
      const [id, raw] = result.compositeToken.split('.');
      expect(id).toBe(mockRefreshToken.id);
      expect(raw).toBeTruthy();
    });
  });

  describe('verifyRefreshToken', () => {
    const validComposite = 'token-123.rawtoken123';

    it('should verify valid refresh token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.verifyRefreshToken(validComposite);

      expect(result).toEqual(mockRefreshToken);
      expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { id: 'token-123' },
      });
    });

    it('should throw UnauthorizedException for malformed token (no dot)', async () => {
      await expect(service.verifyRefreshToken('nodot')).rejects.toThrow(Error);
    });

    it('should throw UnauthorizedException for non-existent token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.verifyRefreshToken(validComposite)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyRefreshToken(validComposite)).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should throw UnauthorizedException for revoked token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...mockRefreshToken,
        revoked: true,
      });

      await expect(service.verifyRefreshToken(validComposite)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyRefreshToken(validComposite)).rejects.toThrow(
        'Refresh token revoked',
      );
    });

    it('should throw UnauthorizedException and revoke expired token', async () => {
      const expiredToken = {
        ...mockRefreshToken,
        expiresAt: new Date(Date.now() - 1000),
      };
      prisma.refreshToken.findUnique.mockResolvedValue(expiredToken);

      await expect(service.verifyRefreshToken(validComposite)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyRefreshToken(validComposite)).rejects.toThrow(
        'Refresh token expired',
      );

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-123' },
        data: { revoked: true },
      });
    });

    it('should revoke token on hash mismatch (theft detection)', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.verifyRefreshToken(validComposite)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-123' },
        data: { revoked: true },
      });
    });
  });

  describe('rotateRefreshTokenAtomic', () => {
    const validComposite = 'token-123.rawtoken123';

    it('should rotate refresh token atomically', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.$transaction.mockResolvedValue([
        { ...mockRefreshToken, revoked: true },
        { ...mockRefreshToken, id: 'new-token-456' },
      ]);

      const result = await service.rotateRefreshTokenAtomic(validComposite);

      expect(result).toHaveProperty('compositeToken');
      expect(result).toHaveProperty('revoked');
      expect(result).toHaveProperty('created');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should revoke old token and create new one in transaction', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.$transaction.mockResolvedValue([
        { ...mockRefreshToken, revoked: true },
        { ...mockRefreshToken, id: 'new-token-456' },
      ]);

      await service.rotateRefreshTokenAtomic(validComposite);

      const calls = prisma.$transaction.mock.calls as unknown[][];

      if (!Array.isArray(calls[0])) {
        throw new Error('Transaction was not called');
      }

      const transactionArg = calls[0][0];

      expect(Array.isArray(transactionArg)).toBe(true);
      expect(transactionArg).toHaveLength(2);
    });

    it('should throw for malformed token', async () => {
      await expect(
        service.rotateRefreshTokenAtomic('malformed'),
      ).rejects.toThrow('Malformed composite token');
    });

    it('should throw for non-existent token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(
        service.rotateRefreshTokenAtomic(validComposite),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for revoked token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...mockRefreshToken,
        revoked: true,
      });

      await expect(
        service.rotateRefreshTokenAtomic(validComposite),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    const validComposite = 'token-123.rawtoken123';

    it('should issue new access and refresh tokens', async () => {
      prisma.refreshToken.findUnique
        .mockResolvedValueOnce(mockRefreshToken)
        .mockResolvedValueOnce({ ...mockRefreshToken, id: 'new-token-456' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.$transaction.mockResolvedValue([
        { ...mockRefreshToken, revoked: true },
        { ...mockRefreshToken, id: 'new-token-456' },
      ]);
      usersService.findUniqueById.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValue('new-access-token');

      const result = await service.refresh(validComposite);

      expect(result).toHaveProperty('accessToken', 'new-access-token');
      expect(result).toHaveProperty('refreshToken');
      expect(jest.spyOn(jwtService, 'signAsync')).toHaveBeenCalled();
    });

    it('should throw if user not found after token rotation', async () => {
      prisma.refreshToken.findUnique
        .mockResolvedValueOnce(mockRefreshToken) // old token
        .mockResolvedValueOnce({
          ...mockRefreshToken,
          id: 'new-token-456',
          revoked: false, // IMPORTANT
        });

      prisma.$transaction.mockResolvedValue([
        { ...mockRefreshToken, revoked: true },
        {
          ...mockRefreshToken,
          id: 'new-token-456',
          revoked: false,
        },
      ]);

      usersService.findUniqueById.mockResolvedValue(null);

      await expect(service.refresh(validComposite)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('logout', () => {
    const validComposite = 'token-123.rawtoken123';

    it('should revoke refresh token on logout', async () => {
      await service.logout(validComposite);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id: 'token-123', revoked: false },
        data: { revoked: true },
      });
    });

    it('should handle missing composite token gracefully', async () => {
      await service.logout(undefined);

      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('should revoke all tokens for user when revokeAll is true', async () => {
      await service.logout(undefined, 'user-123', true);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', revoked: false },
        data: { revoked: true },
      });
    });

    it('should handle empty composite token', async () => {
      await service.logout('');

      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('should handle malformed token (no dot)', async () => {
      await expect(service.logout('malformed')).rejects.toThrow(
        'Malformed composite token',
      );
    });
  });
});
