import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Role } from 'generated/prisma';
import { NotFoundException } from '@nestjs/common';

const mockUser = {
  id: '1',
  email: 'a@test.com',
  username: null,
  passwordHash: 'hashed-password',
  role: Role.USER,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findAll: jest.fn(),
            findUniqueByEmail: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updateRole: jest.fn(),
            updateMe: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(UsersController);
    service = module.get(UsersService);
  });

  it('getAll', async () => {
    service.findAll.mockResolvedValue([]);
    expect(await controller.getAll()).toEqual([]);
  });

  it('getByEmail success', async () => {
    service.findUniqueByEmail.mockResolvedValue(mockUser);

    const user = await controller.getByEmail('a@test.com');
    expect(user).toEqual(mockUser);
  });

  it('getByEmail not found', async () => {
    service.findUniqueByEmail.mockResolvedValue(null);

    await expect(controller.getByEmail('x@test.com')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('create', async () => {
    service.create.mockResolvedValue(mockUser);

    const result = await controller.create({
      email: 'a@test.com',
      password: 'Password123',
    });

    expect(result.id).toBe('1');
  });

  it('updateUserRole', async () => {
    service.updateRole.mockResolvedValue({
      ...mockUser,
      role: Role.ADMIN,
    });

    const result = await controller.updateUserRole('1', {
      role: Role.ADMIN,
    });

    expect(result.role).toBe(Role.ADMIN);
  });

  it('remove', async () => {
    service.remove.mockResolvedValue(mockUser);

    const result = await controller.remove('1');
    expect(result.id).toBe('1');
  });
});
