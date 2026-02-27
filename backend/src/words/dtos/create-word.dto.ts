import { PartOfSpeech, WordLevel } from 'generated/prisma';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateWordDTO {
  @IsString()
  @IsNotEmpty()
  word: string;

  @IsOptional()
  @IsEnum(WordLevel)
  level?: WordLevel;

  @IsEnum(PartOfSpeech)
  partOfSpeech: PartOfSpeech;

  @IsOptional()
  @IsNumber()
  meaningOrder?: number;
}
