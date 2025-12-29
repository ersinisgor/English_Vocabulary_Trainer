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
import { UseGuards } from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'generated/prisma';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CreateUserDTO } from './dtos/create-user.dto';
import { UpdateUserDTO } from './dtos/update-user.dto';
import { UpdateMeDTO } from './dtos/update-me.dto';
import { AuthenticatedRequest } from 'src/auth/types/interfaces/authenticated-request.interface';
import {
  ApiGetAllUsers,
  ApiGetUserByEmail,
  ApiCreateUser,
  ApiUpdateMe,
  ApiUpdateUser,
  ApiDeleteUser,
} from 'src/common/swagger/users/users.swagger';

@Controller('users')
@UseGuards(RolesGuard)
@Serialize(UserResponseDto)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiGetAllUsers()
  async getAll() {
    return this.usersService.findAll();
  }

  @Get(':email')
  @Roles(Role.ADMIN)
  @ApiGetUserByEmail()
  async getByEmail(@Param('email') email: string) {
    const user = await this.usersService.findUniqueByEmail(email);
    if (!user)
      throw new NotFoundException(`User with email ${email} not found`);
    return user;
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiCreateUser()
  async create(@Body() dto: CreateUserDTO) {
    return this.usersService.create(dto);
  }

  @Patch('me')
  @ApiUpdateMe()
  async updateMe(@Req() req: AuthenticatedRequest, @Body() dto: UpdateMeDTO) {
    return this.usersService.updateMe(req.user.id, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiUpdateUser()
  async update(@Param('id') id: string, @Body() dto: UpdateUserDTO) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiDeleteUser()
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
