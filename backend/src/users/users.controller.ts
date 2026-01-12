import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from 'generated/prisma';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { AuthenticatedRequest } from 'src/auth/types/interfaces/authenticated-request.interface';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Serialize } from 'src/common/decorators/serialize.decorator';
import {
  ApiCreateUser,
  ApiDeleteUser,
  ApiGetAllUsers,
  ApiGetUserByEmail,
  ApiUpdateMe,
  ApiUpdateUser,
  ApiUpdateUserRole,
} from 'src/common/swagger/users/users.swagger';
import { CreateUserDTO } from './dtos/create-user.dto';
import { UpdateMeDTO } from './dtos/update-me.dto';
import { UpdateUserDTO } from './dtos/update-user.dto';
import { UserResponseDto } from './dtos/user-response.dto';
import { UsersService } from './users.service';
import { UpdateUserRoleDTO } from './dtos/update-user-role.dto';

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

  @Patch(':id/role')
  @Roles(Role.ADMIN)
  @ApiUpdateUserRole()
  async updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDTO,
  ) {
    return this.usersService.updateRole(id, dto.role);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiDeleteUser()
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
