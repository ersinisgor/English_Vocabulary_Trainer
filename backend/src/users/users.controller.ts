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
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Users')
@Controller('users')
@Serialize(UserResponseDto)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users' })
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
  @ApiOperation({ summary: 'Get a user by email' })
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
  // Temporarily disabled until Role Guard is created
  @ApiOperation({
    summary: 'Create a new user (DISABLED — use /auth/register instead)',
  })
  @ApiResponse({
    status: 403,
    description: 'User creation is blocked',
  })
  create() {
    throw new ForbiddenException(
      'User creation is disabled. Use /auth/register instead.',
    );
  }
  // async create(@Body() dto: CreateUserDto) {
  //   return this.usersService.create(dto);
  // }
}
