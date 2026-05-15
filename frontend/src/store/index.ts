import { create } from 'zustand';
import type { Task, ChatMessage } from '../types';

interface AppState {
  tasks: Task[];
  chatMessages: ChatMessage[];
  selectedTask: Task | null;
  viewMode: 'gantt' | 'kanban';
  isLoading: boolean;

  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addMessage: (msg: ChatMessage) => void;
  setSelectedTask: (task: Task | null) => void;
  setViewMode: (mode: 'gantt' | 'kanban') => void;
  setLoading: (loading: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  tasks: [],
  chatMessages: [],
  selectedTask: null,
  viewMode: 'gantt',
  isLoading: false,

  setTasks: (tasks) => set({ tasks }),

  addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),

  updateTask: (id, data) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)),
    })),

  deleteTask: (id) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

  addMessage: (msg) =>
    set((s) => ({ chatMessages: [...s.chatMessages, msg] })),

  setSelectedTask: (task) => set({ selectedTask: task }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setLoading: (loading) => set({ isLoading: loading }),
}));
