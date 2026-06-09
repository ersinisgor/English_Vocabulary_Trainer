import { apiClient } from './client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  username?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string | null;
  role: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const { data } = await apiClient.post('/auth/login', payload);
    return data.data;
  },

  register: async (payload: RegisterPayload): Promise<AuthUser> => {
    const { data } = await apiClient.post('/auth/register', payload);
    return data.data;
  },

  me: async (): Promise<AuthUser> => {
    const { data } = await apiClient.get('/auth/me');
    return data.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },
};
