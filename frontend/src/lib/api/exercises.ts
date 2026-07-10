import { apiClient } from './client';

export type ExerciseType =
  | 'FLASH_CARD'
  | 'MULTIPLE_CHOICE'
  | 'WRITING'
  | 'TRUE_FALSE'
  | 'MATCHING'
  | 'FIND_IN_SENTENCE'
  | 'TEST';
export type LanguageSetting = 'ENGLISH_NATIVE' | 'ENGLISH_ENGLISH';
export type WordOrder = 'LIST' | 'RANDOM';
export type WrongAnswerSource = 'SAME' | 'ALL' | 'FOLDERS' | 'DATE_RANGE';
export type SessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
export type WordLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type PartOfSpeech =
  | 'NOUN'
  | 'VERB'
  | 'ADJECTIVE'
  | 'ADVERB'
  | 'PHRASAL_VERB'
  | 'IDIOM'
  | 'EXPRESSION';
export type ContentFormat =
  | 'ENGLISH_WORD'
  | 'ENGLISH_DEFINITION'
  | 'ENGLISH_SENTENCE'
  | 'ENGLISH_SENTENCE_CLOZE'
  | 'ENGLISH_SENTENCE_HIGHLIGHTED'
  | 'NATIVE_MEANING'
  | 'NATIVE_SENTENCE'
  | 'NATIVE_SENTENCE_HIGHLIGHTED'
  | 'WORD_FAMILY'
  // Never picked directly — the backend appends it under WORD_FAMILY.
  | 'WORD_FAMILY_MEANING';

export interface FacePart {
  format: ContentFormat;
  text: string;
}

export interface SessionQuestion {
  id: string;
  // Concrete type for Test (mixed) sessions; null falls back to the session type.
  exerciseType: ExerciseType | null;
  questionOrder: number;
  questionText: string;
  correctAnswer: string;
  options: string[];
  prompt: string | null;
  partOfSpeech: string | null;
  front: FacePart[] | null;
  back: FacePart[] | null;
  isAnswered: boolean;
  isCorrect: boolean | null;
  userAnswer: string | null;
  answeredAt: string | null;
}

export interface Session {
  id: string;
  exerciseType: ExerciseType;
  languageSetting: LanguageSetting;
  status: SessionStatus;
  timeLimitSeconds: number | null;
  trackProgress: boolean;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  wrongCount: number;
  startedAt: string;
  completedAt: string | null;
  questions: SessionQuestion[];
}

export interface ExerciseFilters {
  folderIds?: string[];
  wordListIds?: string[];
  levels?: WordLevel[];
  partsOfSpeech?: PartOfSpeech[];
  onlyStarred?: boolean;
  onlyKeepLearning?: boolean;
  excludeLearned?: boolean;
  tagIds?: string[];
}

export interface ExerciseFormats {
  questionFormat?: ContentFormat;
  answerFormat?: ContentFormat;
  frontFormats?: ContentFormat[];
  backFormats?: ContentFormat[];
  exampleOrder?: number;
  // Flash Card: randomize the front/back scenario per question (within language).
  randomFlashFront?: boolean;
  // Flash Card: randomize BOTH the language and scenario per question.
  randomLanguage?: boolean;
}

export interface StartSessionPayload extends ExerciseFilters, ExerciseFormats {
  exerciseType: ExerciseType;
  languageSetting: LanguageSetting;
  // Hand-picked words; restricts the pool to exactly these. Not storable in a preset.
  wordIds?: string[];
  questionCount?: number;
  numberOfOptions?: number;
  wordOrder?: WordOrder;
  askMoreThanOnce?: boolean;
  timeLimitSeconds?: number;
  trackProgress?: boolean;
  testTypes?: ExerciseType[];
  wrongAnswerSource?: WrongAnswerSource;
  wrongAnswerFolderIds?: string[];
  wrongAnswerWordListIds?: string[];
  wrongAnswerFrom?: string;
  wrongAnswerTo?: string;
  presetId?: string;
}

export interface SubmitAnswerResponse {
  question: SessionQuestion;
  session: {
    answeredCount: number;
    correctCount: number;
    wrongCount: number;
    status: SessionStatus;
  };
}

export const exercisesApi = {
  startSession: async (payload: StartSessionPayload): Promise<Session> => {
    const { data } = await apiClient.post('/exercises/sessions', payload);
    return data.data;
  },

  getSession: async (sessionId: string): Promise<Session> => {
    const { data } = await apiClient.get(`/exercises/sessions/${sessionId}`);
    return data.data;
  },

  submitAnswer: async (
    sessionId: string,
    questionId: string,
    answer: string,
  ): Promise<SubmitAnswerResponse> => {
    const { data } = await apiClient.post(
      `/exercises/sessions/${sessionId}/answer`,
      { questionId, answer },
    );
    return data.data;
  },

  getResults: async (sessionId: string): Promise<Session> => {
    const { data } = await apiClient.get(
      `/exercises/sessions/${sessionId}/results`,
    );
    return data.data;
  },
};

// ----- Matching game (word ↔ first native meaning) -----

export interface MatchingPair {
  pairId: string;
  first: string;
  second: string;
}

export interface MatchingResponse {
  pairs: MatchingPair[];
}

export interface StartMatchingPayload extends ExerciseFilters {
  pairCount: number;
  wordIds?: string[];
}

export const matchingApi = {
  start: async (payload: StartMatchingPayload): Promise<MatchingResponse> => {
    const { data } = await apiClient.post('/exercises/matching', payload);
    return data.data;
  },
};

// ----- Exercise settings presets -----

export interface Preset extends ExerciseFilters, ExerciseFormats {
  id: string;
  name: string;
  exerciseType: ExerciseType;
  languageSetting: LanguageSetting;
  questionCount: number;
  numberOfOptions: number;
  wordOrder: WordOrder;
  askMoreThanOnce: boolean;
  timeLimitSeconds: number | null;
  trackProgress: boolean;
  testTypes: ExerciseType[];
  wrongAnswerSource: WrongAnswerSource;
  wrongAnswerFolderIds: string[];
  wrongAnswerWordListIds: string[];
  wrongAnswerFrom: string | null;
  wrongAnswerTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PresetPayload extends ExerciseFilters, ExerciseFormats {
  name: string;
  exerciseType: ExerciseType;
  languageSetting: LanguageSetting;
  questionCount?: number;
  numberOfOptions?: number;
  wordOrder?: WordOrder;
  askMoreThanOnce?: boolean;
  timeLimitSeconds?: number;
  trackProgress?: boolean;
  testTypes?: ExerciseType[];
  wrongAnswerSource?: WrongAnswerSource;
  wrongAnswerFolderIds?: string[];
  wrongAnswerWordListIds?: string[];
  wrongAnswerFrom?: string;
  wrongAnswerTo?: string;
}

export const presetsApi = {
  list: async (): Promise<Preset[]> => {
    const { data } = await apiClient.get('/exercise-settings');
    return data.data;
  },

  create: async (payload: PresetPayload): Promise<Preset> => {
    const { data } = await apiClient.post('/exercise-settings', payload);
    return data.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/exercise-settings/${id}`);
  },
};

// ----- Tags -----

export interface Tag {
  id: string;
  name: string;
}

export const tagsApi = {
  list: async (): Promise<Tag[]> => {
    const { data } = await apiClient.get('/tags');
    return data.data;
  },
};
