import { Expose, Type } from 'class-transformer';
import { SessionStatus } from 'generated/prisma';
import { SessionQuestionResponseDTO } from './session-question-response.dto';

export class SessionSummaryDTO {
  @Expose()
  answeredCount: number;

  @Expose()
  correctCount: number;

  @Expose()
  wrongCount: number;

  @Expose()
  status: SessionStatus;
}

export class SubmitAnswerResponseDTO {
  @Expose()
  @Type(() => SessionQuestionResponseDTO)
  question: SessionQuestionResponseDTO;

  @Expose()
  @Type(() => SessionSummaryDTO)
  session: SessionSummaryDTO;
}
