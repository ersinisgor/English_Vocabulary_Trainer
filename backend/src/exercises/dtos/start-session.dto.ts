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
import {
  ContentFormat,
  ExerciseType,
  LanguageSetting,
  PartOfSpeech,
  WordLevel,
} from 'generated/prisma';

export class StartSessionDTO {
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

  // When provided, the preset supplies defaults; explicit DTO fields override it.
  @IsOptional()
  @IsString()
  presetId?: string;

  // Content format of the question prompt (Flash Card / Multiple Choice).
  @IsOptional()
  @IsEnum(ContentFormat)
  questionFormat?: ContentFormat;

  // Content format of the answer / options (Flash Card / Multiple Choice).
  @IsOptional()
  @IsEnum(ContentFormat)
  answerFormat?: ContentFormat;

  // 1-based example sentence order, used when a sentence format is selected.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  exampleOrder?: number;

  // Flash Card multi-part faces (ordered; first item is the primary content).
  @IsOptional()
  @IsArray()
  @IsEnum(ContentFormat, { each: true })
  frontFormats?: ContentFormat[];

  @IsOptional()
  @IsArray()
  @IsEnum(ContentFormat, { each: true })
  backFormats?: ContentFormat[];

  // Flash Card: randomize the front/back scenario per question (within language).
  @IsOptional()
  @IsBoolean()
  randomFlashFront?: boolean;

  // Flash Card: randomize BOTH the language and the scenario per question.
  @IsOptional()
  @IsBoolean()
  randomLanguage?: boolean;

  // ----- Filters -----

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
