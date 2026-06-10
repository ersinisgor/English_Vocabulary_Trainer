import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ContentFormat,
  ExerciseType,
  LanguageSetting,
  PartOfSpeech,
  WordLevel,
} from 'generated/prisma';

export class CreatePresetDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEnum(ExerciseType)
  exerciseType: ExerciseType;

  @IsEnum(LanguageSetting)
  languageSetting: LanguageSetting;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  questionCount?: number;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(10)
  @Type(() => Number)
  numberOfOptions?: number;

  @IsOptional()
  @IsEnum(ContentFormat)
  questionFormat?: ContentFormat;

  @IsOptional()
  @IsEnum(ContentFormat)
  answerFormat?: ContentFormat;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  exampleOrder?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(ContentFormat, { each: true })
  frontFormats?: ContentFormat[];

  @IsOptional()
  @IsArray()
  @IsEnum(ContentFormat, { each: true })
  backFormats?: ContentFormat[];

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
