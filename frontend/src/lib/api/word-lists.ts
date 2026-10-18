import { apiClient } from './client';
import { Word } from './words';

export interface WordList {
  id: string;
  name: string;
  userId: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WordListItem {
  word: Word;
}

export interface WordListWithItems extends WordList {
  items: WordListItem[];
}

export const wordListsApi = {
  list: async (): Promise<WordList[]> => {
    const { data } = await apiClient.get('/word-lists');
    return data.data;
  },

  get: async (id: string): Promise<WordListWithItems> => {
    const { data } = await apiClient.get(`/word-lists/${id}`);
    return data.data;
  },

  create: async (payload: {
    name: string;
    folderId?: string;
  }): Promise<WordList> => {
    const { data } = await apiClient.post('/word-lists', payload);
    return data.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/word-lists/${id}`);
  },

  addWords: async (
    id: string,
    wordIds: string[],
  ): Promise<WordListWithItems> => {
    const { data } = await apiClient.post(`/word-lists/${id}/words`, {
      wordIds,
    });
    return data.data;
  },

  removeWord: async (
    id: string,
    wordId: string,
  ): Promise<WordListWithItems> => {
    const { data } = await apiClient.delete(
      `/word-lists/${id}/words/${wordId}`,
    );
    return data.data;
  },
};
