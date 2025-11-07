import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class RegisterResponseDTO {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  username: string | null;
}
