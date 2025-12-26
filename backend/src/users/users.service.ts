import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDTO } from './dtos/create-user.dto';
import { User } from 'generated/prisma';
import { ConfigService } from '@nestjs/config';
import { SALT_ROUNDS } from 'src/common/constants/auth.constants';
import * as bcrypt from 'bcrypt';

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
}
