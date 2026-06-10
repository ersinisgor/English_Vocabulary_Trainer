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
  prompt: string | null;

  @Expose()
  partOfSpeech: string | null;

  @Expose()
  front: { format: string; text: string }[] | null;

  @Expose()
  back: { format: string; text: string }[] | null;

  @Expose()
  isAnswered: boolean;

  @Expose()
  isCorrect: boolean | null;

  @Expose()
  userAnswer: string | null;

  @Expose()
  answeredAt: Date | null;
}
