import { ContentFormat } from 'generated/prisma';

/**
 * Resolved question/answer content formats for a configurable exercise
 * (Flash Card and Multiple Choice). Produced by merging preset + DTO with
 * language-aware defaults.
 */
export interface QuestionFormats {
  // Multiple Choice: single prompt format + single answer/option format.
  questionFormat: ContentFormat;
  answerFormat: ContentFormat;
  // Flash Card: ordered content formats shown on each face (first = primary).
  frontFormats: ContentFormat[];
  backFormats: ContentFormat[];
  /** 1-based index of the example sentence to use for sentence formats. */
  exampleOrder?: number;
  /**
   * Flash Card only: when true, each question picks a random front/back scenario
   * within the chosen language, ignoring frontFormats/backFormats.
   */
  randomFront?: boolean;
  /**
   * Flash Card only: when true, each question randomly draws from BOTH
   * languages' scenarios (implies random front; overrides languageSetting).
   */
  randomLanguage?: boolean;
}
