import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDTO } from './dtos/create-user.dto';
import { Role, User } from 'generated/prisma';
import { ConfigService } from '@nestjs/config';
import { SALT_ROUNDS } from 'src/common/constants/auth.constants';
import * as bcrypt from 'bcrypt';
import { UpdateUserDTO } from './dtos/update-user.dto';
import { UpdateMeDTO } from './dtos/update-me.dto';

@Injectable()
export class UsersService {
  private readonly saltRounds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.saltRounds = this.configService.get<number>(
      'bcrypt.saltRounds',
      SALT_ROUNDS,
    );
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async findUniqueByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findUniqueById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(createUserDTO: CreateUserDTO): Promise<User> {
    const { email, password, role, username } = createUserDTO;

    const existingUser = await this.findUniqueByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(password, this.saltRounds);

    return await this.prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        role,
      },
    });
  }

  async update(id: string, dto: UpdateUserDTO): Promise<User> {
    const user = await this.findUniqueById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.email && dto.email !== user.email) {
      const emailExists = await this.findUniqueByEmail(dto.email);
      if (emailExists) {
        throw new ConflictException('Email already in use');
      }
    }

    let passwordHash: string | undefined;

    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email,
        username: dto.username,
        role: dto.role,
        passwordHash,
      },
    });
  }

  async remove(id: string): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.delete({
      where: { id },
    });
  }

  async updateRole(userId: string, role: Role) {
    const user = await this.findUniqueById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  async updateMe(userId: string, dto: UpdateMeDTO): Promise<User> {
    const user = await this.findUniqueById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let passwordHash: string | undefined;

    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        username: dto.username,
        passwordHash,
      },
    });
  }
}
