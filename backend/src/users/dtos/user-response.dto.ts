import { Exclude, Expose } from 'class-transformer';
import { Role } from 'generated/prisma';

@Exclude()
export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  username: string | null;

  @Expose()
  role: Role | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
