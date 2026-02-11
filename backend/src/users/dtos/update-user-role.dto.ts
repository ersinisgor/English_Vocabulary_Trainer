import { IsEnum } from 'class-validator';
import { Role } from 'generated/prisma';

export class UpdateUserRoleDTO {
  @IsEnum(Role)
  role: Role;
}
