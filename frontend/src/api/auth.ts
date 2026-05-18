import { client } from './client';

export async function login(username: string, password: string): Promise<{ access_token: string }> {
  const { data } = await client.post<{ access_token: string }>('/auth/login', { username, password });
  return data;
}

export async function getMe(): Promise<{ user: string } | null> {
  try {
    const { data } = await client.get<{ user: string }>('/auth/me');
    return data;
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  localStorage.setItem('gantt_token', token);
  localStorage.setItem('gantt_auth', '1');
}

export function clearAuthToken(): void {
  localStorage.removeItem('gantt_token');
  localStorage.removeItem('gantt_auth');
}
