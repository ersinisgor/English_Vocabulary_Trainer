import { PartOfSpeech, WordLevel } from 'generated/prisma';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FindWordsQueryDTO {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: WordLevel })
  @IsOptional()
  @IsEnum(WordLevel)
  level?: WordLevel;

  @ApiPropertyOptional({ enum: PartOfSpeech })
  @IsOptional()
  @IsEnum(PartOfSpeech)
  partOfSpeech?: PartOfSpeech;

  @ApiPropertyOptional({ example: 'run' })
  @IsOptional()
  @IsString()
  search?: string;
}
