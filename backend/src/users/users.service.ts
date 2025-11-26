import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDTO } from './dtos/create-user.dto';
import { User } from 'generated/prisma';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async findUniqueByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findUniqueById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(createUserDto: CreateUserDTO): Promise<User> {
    const { email, password, username } = createUserDto;
    return await this.prisma.user.create({
      data: {
        email,
        username,
        passwordHash: password,
      },
    });
  }
}
