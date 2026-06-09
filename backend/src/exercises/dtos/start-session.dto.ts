import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ExerciseType, LanguageSetting } from 'generated/prisma';

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
  questionCount?: number = 10;
}
