import { client } from './client';
import type { Task, TaskFormData } from '../types';

export async function fetchTasks(): Promise<Task[]> {
  const { data } = await client.get<Task[]>('/tasks/');
  return data;
}

export async function createTask(payload: TaskFormData): Promise<Task> {
  const { data } = await client.post<Task>('/tasks/', payload);
  return data;
}

export async function updateTask(
  id: string,
  payload: Partial<TaskFormData>,
): Promise<Task> {
  const { data } = await client.put<Task>(`/tasks/${id}`, payload);
  return data;
}

export async function deleteTask(id: string): Promise<void> {
  await client.delete(`/tasks/${id}`);
}

export async function seedPlan(): Promise<void> {
  await client.post('/plan/seed');
}

export async function resetPlan(): Promise<void> {
  await client.delete('/plan/reset');
}
