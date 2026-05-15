import { create } from 'zustand';
import { Task, ChatMessage } from '../types';

interface State {
  tasks: Task[];
  chatMessages: ChatMessage[];
  selectedTask: Task | null;
  viewMode: 'gantt' | 'kanban';
  autoSave: boolean;
  setTasks: (t: Task[]) => void;
  addTask: (t: Task) => void;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addMessage: (m: ChatMessage) => void;
  setMessages: (m: ChatMessage[]) => void;
  setSelectedTask: (t: Task | null) => void;
  setViewMode: (m: 'gantt' | 'kanban') => void;
  setAutoSave: (v: boolean) => void;
}

export const useStore = create<State>(set => ({
  tasks: [],
  chatMessages: [],
  selectedTask: null,
  viewMode: 'gantt',
  autoSave: true,
  setTasks: t => set({ tasks: t }),
  addTask: t => set(s => ({ tasks: [...s.tasks, t] })),
  updateTask: (id, data) => set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...data } : t) })),
  deleteTask: id => set(s => ({ tasks: s.tasks.filter(t => t.id !== id) })),
  addMessage: m => set(s => ({ chatMessages: [...s.chatMessages, m] })),
  setMessages: m => set({ chatMessages: m }),
  setSelectedTask: t => set({ selectedTask: t }),
  setViewMode: m => set({ viewMode: m }),
  setAutoSave: v => set({ autoSave: v }),
}));
