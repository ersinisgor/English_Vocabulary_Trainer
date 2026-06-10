import { PartOfSpeech, WordLevel } from 'generated/prisma';

/**
 * Normalized filter set used to build the meaning pool for an exercise session.
 * Produced by merging a preset (if any) with the request DTO.
 */
export interface MeaningFilter {
  folderIds?: string[];
  wordListIds?: string[];
  levels?: WordLevel[];
  partsOfSpeech?: PartOfSpeech[];
  onlyStarred?: boolean;
  onlyKeepLearning?: boolean;
  excludeLearned?: boolean;
  tagIds?: string[];
}
