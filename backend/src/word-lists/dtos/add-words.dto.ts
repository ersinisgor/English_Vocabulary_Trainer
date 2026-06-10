import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class AddWordsDTO {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  wordIds: string[];
}
