import { Expose } from 'class-transformer';

export class FolderResponseDTO {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  userId: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
