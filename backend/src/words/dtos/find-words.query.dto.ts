import { PartOfSpeech, WordLevel } from 'generated/prisma';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class FindWordsQueryDTO {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(WordLevel)
  level?: WordLevel;

  @IsOptional()
  @IsEnum(PartOfSpeech)
  partOfSpeech?: PartOfSpeech;

  @IsOptional()
  @IsString()
  search?: string;

  // Filter words that have at least one meaning tagged with any of these tag IDs.
  // Query arrays arrive as `tagIds[]=a&tagIds[]=b`; a single value is coerced to an array.
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}
