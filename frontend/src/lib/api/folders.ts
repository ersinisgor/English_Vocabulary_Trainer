import { apiClient } from './client';

export interface Folder {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export const foldersApi = {
  list: async (): Promise<Folder[]> => {
    const { data } = await apiClient.get('/folders');
    return data.data;
  },

  create: async (name: string): Promise<Folder> => {
    const { data } = await apiClient.post('/folders', { name });
    return data.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/folders/${id}`);
  },
};
