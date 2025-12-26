import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Serialize } from 'src/common/decorators/serialize.decorator';
import { UserResponseDto } from './dtos/user-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'generated/prisma';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CreateUserDTO } from './dtos/create-user.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(RolesGuard)
@Serialize(UserResponseDto)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all users (ADMIN only)' })
  @ApiResponse({
    status: 200,
    description: 'List of all users',
    type: UserResponseDto,
    isArray: true,
  })
  async getAll() {
    return this.usersService.findAll();
  }

  @Get(':email')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get a user by email (ADMIN only)' })
  @ApiParam({
    name: 'email',
    type: String,
    description: 'Email of the user to fetch',
  })
  @ApiResponse({
    status: 200,
    description: 'User with the given email',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getByEmail(@Param('email') email: string) {
    const user = await this.usersService.findUniqueByEmail(email);
    if (!user)
      throw new NotFoundException(`User with email ${email} not found`);
    return user;
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create user (ADMIN only)' })
  @ApiBody({ type: CreateUserDTO })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists',
  })
  async create(@Body() dto: CreateUserDTO) {
    return this.usersService.create(dto);
  }
}
