import { Exclude, Expose } from 'class-transformer';
import { Role } from 'generated/prisma';

@Exclude()
export class RegisterResponseDTO {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  username: string | null;

  @Expose()
  role: Role;
}
