import { PartOfSpeech, WordLevel } from 'generated/prisma';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWordDTO {
  @ApiProperty({ example: 'run' })
  @IsString()
  @IsNotEmpty()
  word: string;

  @ApiPropertyOptional({ enum: WordLevel })
  @IsOptional()
  @IsEnum(WordLevel)
  level?: WordLevel;

  @ApiProperty({ enum: PartOfSpeech })
  @IsEnum(PartOfSpeech)
  partOfSpeech: PartOfSpeech;
}
