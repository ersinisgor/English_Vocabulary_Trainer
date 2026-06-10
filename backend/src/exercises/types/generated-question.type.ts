import { ContentFormat } from 'generated/prisma';

export interface FacePart {
  format: ContentFormat;
  text: string;
}

export interface GeneratedQuestion {
  questionText: string;
  correctAnswer: string;
  options: string[];
  prompt?: string;
  // Multi-part faces for Flash Cards (front/back can show several pieces).
  front?: FacePart[];
  back?: FacePart[];
  // Lowercase part-of-speech label shown separately (Flash Card / MC question).
  partOfSpeech?: string;
}
