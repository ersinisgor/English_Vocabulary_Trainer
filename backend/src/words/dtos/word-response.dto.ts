import { PartOfSpeech, WordLevel } from 'generated/prisma';
import { Expose } from 'class-transformer';

export class WordResponseDTO {
  @Expose()
  id: string;

  @Expose()
  word: string;

  @Expose()
  level: WordLevel | null;

  @Expose()
  partOfSpeech: PartOfSpeech;

  @Expose()
  userId: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
