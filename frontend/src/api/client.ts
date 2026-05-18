import axios, { AxiosError } from 'axios';

export const client = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

client.interceptors.request.use(config => {
  const token = localStorage.getItem('gantt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('gantt_token');
      localStorage.removeItem('gantt_auth');
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    const message = (error.response?.data as { detail?: string })?.detail
      ?? error.message
      ?? 'Network error';
    return Promise.reject(new Error(message));
  }
);
