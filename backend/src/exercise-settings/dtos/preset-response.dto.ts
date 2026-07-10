import { Expose } from 'class-transformer';
import {
  ContentFormat,
  ExerciseType,
  LanguageSetting,
  PartOfSpeech,
  WordLevel,
  WordOrder,
  WrongAnswerSource,
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
  wordOrder: WordOrder;

  @Expose()
  askMoreThanOnce: boolean;

  @Expose()
  timeLimitSeconds: number | null;

  @Expose()
  trackProgress: boolean;

  @Expose()
  testTypes: ExerciseType[];

  @Expose()
  wrongAnswerSource: WrongAnswerSource;

  @Expose()
  wrongAnswerFolderIds: string[];

  @Expose()
  wrongAnswerWordListIds: string[];

  @Expose()
  wrongAnswerFrom: Date | null;

  @Expose()
  wrongAnswerTo: Date | null;

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
