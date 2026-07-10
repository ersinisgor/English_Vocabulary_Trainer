import { PartOfSpeech, WordLevel } from 'generated/prisma';

/**
 * Normalized filter set used to build the meaning pool for an exercise session.
 * Produced by merging a preset (if any) with the request DTO.
 */
export interface MeaningFilter {
  // Explicit word selection; when set, no other filter can widen the pool.
  wordIds?: string[];
  folderIds?: string[];
  wordListIds?: string[];
  levels?: WordLevel[];
  partsOfSpeech?: PartOfSpeech[];
  onlyStarred?: boolean;
  onlyKeepLearning?: boolean;
  excludeLearned?: boolean;
  tagIds?: string[];
}
