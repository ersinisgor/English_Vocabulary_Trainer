import { IsNotEmpty, IsString } from 'class-validator';

export class AnswerQuestionDTO {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  // Allowed to be empty: a timed-out question auto-submits a blank (wrong) answer.
  @IsString()
  answer: string;
}
