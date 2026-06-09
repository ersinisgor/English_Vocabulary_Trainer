import { Expose, Type } from 'class-transformer';
import { ExerciseType, LanguageSetting, SessionStatus } from 'generated/prisma';
import { SessionQuestionResponseDTO } from './session-question-response.dto';

export class SessionResponseDTO {
  @Expose()
  id: string;

  @Expose()
  exerciseType: ExerciseType;

  @Expose()
  languageSetting: LanguageSetting;

  @Expose()
  status: SessionStatus;

  @Expose()
  totalQuestions: number;

  @Expose()
  answeredCount: number;

  @Expose()
  correctCount: number;

  @Expose()
  wrongCount: number;

  @Expose()
  startedAt: Date;

  @Expose()
  completedAt: Date | null;

  @Expose()
  @Type(() => SessionQuestionResponseDTO)
  questions: SessionQuestionResponseDTO[];
}
