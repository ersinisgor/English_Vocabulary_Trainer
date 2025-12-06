import { PartOfSpeech, WordLevel } from 'generated/prisma';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreateWordDTO {
  @IsString()
  @IsNotEmpty()
  word: string;

  @IsEnum(WordLevel)
  level: WordLevel;

  @IsEnum(PartOfSpeech)
  partOfSpeech: PartOfSpeech;
}
