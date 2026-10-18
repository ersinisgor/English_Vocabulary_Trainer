import {
  IsArray,
  IsBoolean,
  IsDateString,
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
  WordOrder,
  WrongAnswerSource,
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

  // Presentation order of the selected questions (list order vs. shuffled).
  @IsOptional()
  @IsEnum(WordOrder)
  wordOrder?: WordOrder;

  // Ask ~1/5 of the session's words a second time.
  @IsOptional()
  @IsBoolean()
  askMoreThanOnce?: boolean;

  // Per-question countdown in seconds; 0 (or omitted) means untimed.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(600)
  @Type(() => Number)
  timeLimitSeconds?: number;

  // Flash Card: when false, cards are browsed without grading (defaults true).
  @IsOptional()
  @IsBoolean()
  trackProgress?: boolean;

  // Test (mixed) mode: the gradable types each question is drawn from.
  @IsOptional()
  @IsArray()
  @IsEnum(ExerciseType, { each: true })
  testTypes?: ExerciseType[];

  // ----- Wrong answers (distractor) source -----

  @IsOptional()
  @IsEnum(WrongAnswerSource)
  wrongAnswerSource?: WrongAnswerSource;

  // FOLDERS source: folders/lists to draw distractors from.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  wrongAnswerFolderIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  wrongAnswerWordListIds?: string[];

  // DATE_RANGE source: words added within [from, to] (ISO date strings).
  @IsOptional()
  @IsDateString()
  wrongAnswerFrom?: string;

  @IsOptional()
  @IsDateString()
  wrongAnswerTo?: string;

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

  // Hand-picked words; restricts the pool to exactly these.
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
