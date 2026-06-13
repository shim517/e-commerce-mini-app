import axios from 'axios';
import type { User } from '@/types';
import type { ProductFeed } from '@/domain/product';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  withCredentials: true, // send httpOnly cookies on every request
});

let isRefreshing = false;
let pendingQueue: Array<{ resolve: () => void; reject: (err: unknown) => void }> = [];

function drainQueue(err?: unknown) {
  pendingQueue.forEach((p) => (err ? p.reject(err) : p.resolve()));
  pendingQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean };

    const url = original.url ?? '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh');
    if (error.response?.status !== 401 || original._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request until the refresh finishes
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: () => resolve(api(original)),
          reject,
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      await api.post('/auth/refresh');
      drainQueue();
      return api(original);
    } catch (refreshError) {
      drainQueue(refreshError);
      if (typeof window !== 'undefined') window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ user: User }>('/auth/login', { email, password }),

  logout: () => api.post('/auth/logout'),

  me: () => api.get<User>('/auth/me'),
};

export const productsApi = {
  getPage: (cursor?: number, limit = 20) =>
    api
      .get<ProductFeed>('/products', { params: { cursor, limit } })
      .then((r) => r.data),
};

export default api;
