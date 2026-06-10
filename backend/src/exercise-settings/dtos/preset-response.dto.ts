import { Expose } from 'class-transformer';
import {
  ContentFormat,
  ExerciseType,
  LanguageSetting,
  PartOfSpeech,
  WordLevel,
} from 'generated/prisma';

export class PresetResponseDTO {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  userId: string;

  @Expose()
  exerciseType: ExerciseType;

  @Expose()
  languageSetting: LanguageSetting;

  @Expose()
  questionCount: number;

  @Expose()
  numberOfOptions: number;

  @Expose()
  questionFormat: ContentFormat | null;

  @Expose()
  answerFormat: ContentFormat | null;

  @Expose()
  exampleOrder: number | null;

  @Expose()
  frontFormats: ContentFormat[];

  @Expose()
  backFormats: ContentFormat[];

  @Expose()
  folderIds: string[];

  @Expose()
  wordListIds: string[];

  @Expose()
  levels: WordLevel[];

  @Expose()
  partsOfSpeech: PartOfSpeech[];

  @Expose()
  onlyStarred: boolean;

  @Expose()
  onlyKeepLearning: boolean;

  @Expose()
  excludeLearned: boolean;

  @Expose()
  tagIds: string[];

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
