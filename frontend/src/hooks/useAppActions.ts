import { useCallback, useState } from 'react';
import { useStore } from '../store';
import { fetchTasks } from '../api/tasks';
import { Task } from '../types';

/** Hook for app-level actions: refresh, command, notifications, sync */
export function useAppActions() {
  const { tasks, setTasks } = useStore();
  const [notification, setNotification] = useState('');
  const [unsaved, setUnsaved] = useState(false);

  const notify = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  }, []);

  const refreshTasks = useCallback(async () => {
    console.log('[AppActions] refreshTasks called');
    try {
      const newTasks = await fetchTasks();
      console.log('[AppActions] fetchTasks returned:', newTasks);
      // Always update, even if empty — this ensures sync with backend
      setTasks(newTasks || []);
      console.log('[AppActions] setTasks called with', (newTasks || []).length, 'tasks');
    } catch (err) {
      console.error('[AppActions] refreshTasks failed:', err);
    }
  }, [setTasks]);

  const runCommand = useCallback(async (message: string) => {
    try {
      const { client } = await import('../api/client');
      await client.post('/chat/', { message, history: [] });
      await refreshTasks();
    } catch (err) {
      console.error("Command failed", err);
    }
  }, [refreshTasks]);

  const handleTaskUpdate = useCallback(async (task: Task) => {
    useStore.getState().updateTask(task.id, task);
    setUnsaved(true);
    try {
      const { client } = await import('../api/client');
      await client.put(`/tasks/${task.id}`, task);
    } catch (err) {
      console.error("Failed to update task on backend:", err);
    }
  }, []);

  return {
    tasks,
    notification,
    unsaved,
    setUnsaved,
    notify,
    refreshTasks,
    runCommand,
    handleTaskUpdate,
  };
}
