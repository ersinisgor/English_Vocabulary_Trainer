import { Expose } from 'class-transformer';

export class UserMeaningStateResponseDTO {
  @Expose()
  id: string;

  @Expose()
  meaningId: string;

  @Expose()
  isStarred: boolean;

  @Expose()
  keepLearning: boolean;

  @Expose()
  correctCount: number;

  @Expose()
  wrongCount: number;

  @Expose()
  practiceCount: number;

  @Expose()
  streakCount: number;

  @Expose()
  firstReviewAt: Date | null;

  @Expose()
  lastReviewedAt: Date | null;

  @Expose()
  nextReviewAt: Date | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
