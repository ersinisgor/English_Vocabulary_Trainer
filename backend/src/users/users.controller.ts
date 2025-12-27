import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
  Delete,
  Patch,
  Req,
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
import { UpdateUserDTO } from './dtos/update-user.dto';
import { UpdateMeDTO } from './dtos/update-me.dto';
import { AuthenticatedRequest } from 'src/auth/types/interfaces/authenticated-request.interface';

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

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update user (ADMIN only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists',
  })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDTO) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete user' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async updateMe(@Req() req: AuthenticatedRequest, @Body() dto: UpdateMeDTO) {
    return this.usersService.updateMe(req.user.id, dto);
  }
}
