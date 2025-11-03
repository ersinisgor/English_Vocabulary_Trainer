import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  username: string | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
