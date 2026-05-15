import { useEffect } from 'react';
import { useStore } from './store';
import { fetchTasks, seedPlan, updateTask } from './api/tasks';
import Header from './components/Header';
import GanttView from './components/GanttView';
import KanbanView from './components/KanbanView';
import ChatPanel from './components/ChatPanel';
import TaskModal from './components/TaskModal';

export default function App() {
  const { tasks, viewMode, selectedTask, isLoading, setTasks, setSelectedTask, setViewMode, setLoading, updateTask: storeUpdate } = useStore();

  const loadTasks = async () => {
    setLoading(true);
    try { setTasks(await fetchTasks()); }
    catch (err) { console.error('Failed to load tasks', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadTasks(); }, []);

  const handleSeed = async () => {
    await seedPlan();
    await loadTasks();
  };

  const handleTaskUpdate = async (id: string, data: any) => {
    const updated = await updateTask(id, data);
    storeUpdate(id, updated);
  };

  const handleTaskClick = (task: typeof tasks[0]) => setSelectedTask(task);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#12122a', color: '#eee', fontFamily: 'system-ui, sans-serif' }}>
      <Header viewMode={viewMode} onViewChange={setViewMode} onSeed={handleSeed} onUploaded={loadTasks} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
              Loading...
            </div>
          ) : viewMode === 'gantt' ? (
            <GanttView tasks={tasks} onTaskClick={handleTaskClick} onTaskUpdate={(t) => handleTaskUpdate(t.id, t)} />
          ) : (
            <KanbanView tasks={tasks} onTaskClick={handleTaskClick} onTaskUpdate={handleTaskUpdate} />
          )}
        </div>
        <div style={{ width: 350, flexShrink: 0 }}>
          <ChatPanel />
        </div>
      </div>
      {selectedTask && (
        <TaskModal task={selectedTask} onSave={handleTaskUpdate} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  );
}
