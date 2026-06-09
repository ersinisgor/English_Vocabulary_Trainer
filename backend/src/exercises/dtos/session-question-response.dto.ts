import { Expose } from 'class-transformer';

export class SessionQuestionResponseDTO {
  @Expose()
  id: string;

  @Expose()
  questionOrder: number;

  @Expose()
  questionText: string;

  @Expose()
  correctAnswer: string;

  @Expose()
  options: string[];

  @Expose()
  isAnswered: boolean;

  @Expose()
  isCorrect: boolean | null;

  @Expose()
  userAnswer: string | null;

  @Expose()
  answeredAt: Date | null;
}
