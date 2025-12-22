import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartOfSpeech, WordLevel } from 'generated/prisma';
import { Expose } from 'class-transformer';

export class WordResponseDTO {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty({ example: 'run' })
  @Expose()
  word: string;

  @ApiPropertyOptional({ enum: WordLevel, nullable: true })
  @Expose()
  level: WordLevel | null;

  @ApiProperty({ enum: PartOfSpeech })
  @Expose()
  partOfSpeech: PartOfSpeech;

  @ApiProperty()
  @Expose()
  userId: string;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;
}
