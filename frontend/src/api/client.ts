import axios from 'axios';

export const client = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

client.interceptors.request.use(config => {
  const token = localStorage.getItem('gantt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
