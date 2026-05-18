import { useCallback, useState } from 'react';
import { useStore } from '../store';
import { fetchTasks } from '../api/tasks';
import { Task } from '../types';

/** Hook for app-level actions: refresh, command, notifications, sync */
export function useAppActions() {
  const { tasks, setTasks } = useStore();
  const [notification, setNotification] = useState('');
  const [unsaved, setUnsaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const notify = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  }, []);

  const refreshTasks = useCallback(async () => {
    setLoading(true);
    try {
      const newTasks = await fetchTasks();
      if (newTasks && newTasks.length > 0) {
        setTasks(newTasks);
      }
    } catch (err) {
      console.error('[AppActions] refreshTasks failed:', err);
    } finally {
      setLoading(false);
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
    loading,
  };
}
