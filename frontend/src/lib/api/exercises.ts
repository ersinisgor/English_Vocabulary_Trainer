import { apiClient } from './client';

export type ExerciseType = 'FLASH_CARD' | 'MULTIPLE_CHOICE';
export type LanguageSetting = 'ENGLISH_NATIVE' | 'ENGLISH_ENGLISH';
export type SessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';

export interface SessionQuestion {
  id: string;
  questionOrder: number;
  questionText: string;
  correctAnswer: string;
  options: string[];
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
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  wrongCount: number;
  startedAt: string;
  completedAt: string | null;
  questions: SessionQuestion[];
}

export interface StartSessionPayload {
  exerciseType: ExerciseType;
  languageSetting: LanguageSetting;
  questionCount?: number;
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

  submitAnswer: async (sessionId: string, questionId: string, answer: string): Promise<SubmitAnswerResponse> => {
    const { data } = await apiClient.post(`/exercises/sessions/${sessionId}/answer`, {
      questionId,
      answer,
    });
    return data.data;
  },

  getResults: async (sessionId: string): Promise<Session> => {
    const { data } = await apiClient.get(`/exercises/sessions/${sessionId}/results`);
    return data.data;
  },
};
