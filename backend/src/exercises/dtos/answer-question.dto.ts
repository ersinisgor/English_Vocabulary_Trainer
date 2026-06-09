import { IsNotEmpty, IsString } from 'class-validator';

export class AnswerQuestionDTO {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @IsString()
  @IsNotEmpty()
  answer: string;
}
