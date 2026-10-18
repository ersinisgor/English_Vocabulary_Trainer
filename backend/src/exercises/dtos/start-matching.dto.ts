import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartOfSpeech, WordLevel } from 'generated/prisma';

export class StartMatchingDTO {
  // Number of pairs on the board: 8 for a 4×4 grid, 18 for a 6×6 grid. Each
  // pair couples an English word with the first split of its native meaning.
  @IsInt()
  @Min(2)
  @Max(18)
  @Type(() => Number)
  pairCount: number;

  // ----- Filters (mirror the session filters) -----

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  wordIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  folderIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  wordListIds?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(WordLevel, { each: true })
  levels?: WordLevel[];

  @IsOptional()
  @IsArray()
  @IsEnum(PartOfSpeech, { each: true })
  partsOfSpeech?: PartOfSpeech[];

  @IsOptional()
  @IsBoolean()
  onlyStarred?: boolean;

  @IsOptional()
  @IsBoolean()
  onlyKeepLearning?: boolean;

  @IsOptional()
  @IsBoolean()
  excludeLearned?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}
