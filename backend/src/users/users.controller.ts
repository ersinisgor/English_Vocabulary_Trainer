import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
// import { CreateUserDto } from './dtos/create-user.dto';
import { Serialize } from 'src/common/decorators/serialize.decorator';
import { UserResponseDto } from './dtos/user-response.dto';

@Controller('users')
@Serialize(UserResponseDto)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getAll() {
    return this.usersService.findAll();
  }

  @Get(':email')
  async getByEmail(@Param('email') email: string) {
    const user = await this.usersService.findUniqueByEmail(email);
    if (!user)
      throw new NotFoundException(`User with email ${email} not found`);
    return user;
  }

  @Post()
  // Temporarily disabled until Role Guard is created
  create() {
    throw new ForbiddenException(
      'User creation is disabled. Use /auth/register instead.',
    );
  }
  // async create(@Body() dto: CreateUserDto) {
  //   return this.usersService.create(dto);
  // }
}
