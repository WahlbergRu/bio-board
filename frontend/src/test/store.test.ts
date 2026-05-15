import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';
import { Task, ChatMessage } from '../types';

beforeEach(() => {
  useStore.setState({
    tasks: [],
    chatMessages: [],
    selectedTask: null,
    viewMode: 'gantt',
    autoSave: true,
  });
});

const mockTask: Task = {
  id: '1', name: 'Test', description: 'Desc',
  start_date: '2026-01-01', end_date: '2026-01-05',
  progress: 0, type: 'task', dependencies: [],
  assignee: 'Alice', project: '',
};

describe('useStore', () => {
  it('starts with empty tasks', () => {
    expect(useStore.getState().tasks).toEqual([]);
  });

  it('sets tasks', () => {
    useStore.getState().setTasks([mockTask]);
    expect(useStore.getState().tasks).toHaveLength(1);
    expect(useStore.getState().tasks[0].name).toBe('Test');
  });

  it('adds a task', () => {
    useStore.getState().addTask(mockTask);
    expect(useStore.getState().tasks).toHaveLength(1);
  });

  it('updates a task', () => {
    useStore.getState().setTasks([mockTask]);
    useStore.getState().updateTask('1', { name: 'Updated' });
    expect(useStore.getState().tasks[0].name).toBe('Updated');
  });

  it('deletes a task', () => {
    useStore.getState().setTasks([mockTask]);
    useStore.getState().deleteTask('1');
    expect(useStore.getState().tasks).toHaveLength(0);
  });

  it('sets and clears selected task', () => {
    useStore.getState().setSelectedTask(mockTask);
    expect(useStore.getState().selectedTask).toEqual(mockTask);
    useStore.getState().setSelectedTask(null);
    expect(useStore.getState().selectedTask).toBeNull();
  });

  it('toggles view mode', () => {
    useStore.getState().setViewMode('kanban');
    expect(useStore.getState().viewMode).toBe('kanban');
    useStore.getState().setViewMode('gantt');
    expect(useStore.getState().viewMode).toBe('gantt');
  });

  it('toggles autoSave', () => {
    useStore.getState().setAutoSave(false);
    expect(useStore.getState().autoSave).toBe(false);
    useStore.getState().setAutoSave(true);
    expect(useStore.getState().autoSave).toBe(true);
  });

  it('adds chat messages', () => {
    const msg: ChatMessage = { role: 'user', content: 'Hello' };
    useStore.getState().addMessage(msg);
    expect(useStore.getState().chatMessages).toHaveLength(1);
  });

  it('replaces chat messages', () => {
    const msgs: ChatMessage[] = [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello' },
    ];
    useStore.getState().setMessages(msgs);
    expect(useStore.getState().chatMessages).toHaveLength(2);
  });
});
