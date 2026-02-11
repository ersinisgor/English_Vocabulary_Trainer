import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from 'generated/prisma';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

type PrismaUserDelegateMock = {
  findMany: jest.Mock;
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

type PrismaServiceMock = {
  user: PrismaUserDelegateMock;
};

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaServiceMock;

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(4) },
        },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should return users', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findUniqueByEmail', () => {
    it('should return user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1' });
      const user = await service.findUniqueByEmail('a@test.com');
      expect(user).toBeDefined();
    });
  });

  describe('create', () => {
    it('should create user with hashed password', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: '1' });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      const result = await service.create({
        email: 'test@test.com',
        password: 'Password123',
        username: 'test',
      });

      expect(bcrypt.hash).toHaveBeenCalled();
      expect(prisma.user.create).toHaveBeenCalled();
      expect(result.id).toBe('1');
    });

    it('should throw ConflictException if email exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1' });

      await expect(
        service.create({
          email: 'test@test.com',
          password: 'Password123',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({
          id: '1',
          email: 'a@test.com',
        })
        .mockResolvedValueOnce(null); // email uniqueness check

      prisma.user.update.mockResolvedValue({
        id: '1',
        email: 'new@test.com',
      });

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      const result = await service.update('1', {
        email: 'new@test.com',
        password: 'Password123',
      });

      expect(result.id).toBe('1');
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.update('1', { email: 'x@test.com' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw ConflictException on email conflict', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: '1', email: 'old@test.com' }) // user itself
        .mockResolvedValueOnce({ id: '2', email: 'taken@test.com' }); // conflict

      await expect(
        service.update('1', { email: 'taken@test.com' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('updateRole', () => {
    it('should update role', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1' });
      prisma.user.update.mockResolvedValue({
        id: '1',
        role: Role.ADMIN,
      });

      const result = await service.updateRole('1', Role.ADMIN);
      expect(result.role).toBe(Role.ADMIN);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { role: Role.ADMIN },
      });
    });

    it('should throw NotFoundException', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.updateRole('1', Role.ADMIN)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updateMe', () => {
    it('should update own user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1' });
      prisma.user.update.mockResolvedValue({ id: '1' });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      const result = await service.updateMe('1', { password: 'Password123' });
      expect(result.id).toBe('1');
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMe('1', { username: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete user', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: '1' });
      prisma.user.delete.mockResolvedValue({ id: '1' });

      const result = await service.remove('1');

      expect(result.id).toBe('1');
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.remove('1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
