import { apiClient } from './client';

export interface Word {
  id: string;
  word: string;
  level: string | null;
  partOfSpeech: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WordsResponse {
  data: Word[];
  meta: { total: number; page: number; limit: number };
}

export interface WordsQuery {
  page?: number;
  limit?: number;
  search?: string;
  level?: string;
  partOfSpeech?: string;
}

export const wordsApi = {
  getAll: async (query: WordsQuery = {}): Promise<WordsResponse> => {
    const { data } = await apiClient.get('/words', { params: query });
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/words/${id}`);
  },
};
