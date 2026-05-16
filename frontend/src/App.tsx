import { useState, useEffect } from 'react';
import { useStore } from './store';
import { client } from './api/client';
import { fetchTasks, seedPlan } from './api/tasks';
import { exportExcel, exportIcal } from './api/excel';
import Header from './components/Header';
import GanttView from './components/GanttView';
import KanbanView from './components/KanbanView';
import ChatPanel from './components/ChatPanel';
import TaskModal from './components/TaskModal';
import AuthModal from './components/AuthModal';
import Notification from './components/Notification';
import { Task } from './types';
import { ui } from './i18n';

const SAVE_KEY = 'gantt_plan';

export default function App() {
  const { tasks, chatMessages, selectedTask, viewMode, autoSave, setTasks, setMessages, setSelectedTask, setViewMode, setAutoSave } = useStore();
  const [zoomLevel, setZoomLevel] = useState<'day' | 'week' | 'month' | 'quarter'>('week');
  const [showAuth, setShowAuth] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [notification, setNotification] = useState('');
  const [unsaved, setUnsaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) { try { setTasks(JSON.parse(saved)); } catch {} }
    const auth = localStorage.getItem('gantt_auth');
    if (auth) setIsAuthenticated(true);
    fetchTasks().then(setTasks).catch(() => {});
  }, [setTasks]);

  useEffect(() => {
    if (autoSave && tasks.length > 0) {
      localStorage.setItem(SAVE_KEY, JSON.stringify(tasks));
      setUnsaved(false);
    }
  }, [tasks, autoSave]);

  const notify = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(''), 3000); };

  const handleSave = () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(tasks));
    setUnsaved(false);
    notify(ui.saveSuccess);
  };

  const handleTaskClick = (t: Task) => { setSelectedTask(t); setShowModal(true); };

  const handleTaskSave = (t: Task) => {
    handleTaskUpdate(t);
    setShowModal(false);
    setUnsaved(true);
  };

  const handleTaskUpdate = async (task: Task) => {
    try {
      await client.put(`/tasks/${task.id}/`, task);
      useStore.getState().updateTask(task.id, task);
    } catch (err) {
      console.error("Failed to update task", err);
    }
  };

  const handleReassign = (id: string, assignee: string) => {
    useStore.getState().updateTask(id, { assignee });
    setUnsaved(true);
  };

  const handleSeed = () => { seedPlan().then(() => fetchTasks()).then(setTasks).catch(() => {}); };
  const handleUpload = (count: number) => { fetchTasks().then(setTasks); notify(ui.uploadSuccess.replace('{count}', String(count))); };
  const handleExport = () => { exportExcel(); notify(ui.exportSuccess); };
  const handleExportIcal = () => { exportIcal(tasks); notify(ui.exportSuccess); };

  const handleLogin = () => setShowAuth(true);
  const handleLogout = () => { localStorage.removeItem('gantt_auth'); setIsAuthenticated(false); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1a1a2e', color: '#eee' }}>
      <Header viewMode={viewMode} zoomLevel={zoomLevel} onViewChange={setViewMode} onZoomChange={setZoomLevel}
        onSeed={handleSeed} onUpload={handleUpload} onExport={handleExport} onExportIcal={handleExportIcal}
        onSave={handleSave} onToggleAutoSave={() => setAutoSave(!autoSave)} autoSave={autoSave}
        onLogin={handleLogin} onLogout={handleLogout} isAuthenticated={isAuthenticated} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {viewMode === 'gantt'
            ? <GanttView tasks={tasks} onTaskClick={handleTaskClick} onTaskUpdate={handleTaskUpdate} zoom={zoomLevel} />
            : <KanbanView tasks={tasks} onTaskClick={handleTaskClick} onReassign={handleReassign} />
          }
          {tasks.length === 0 && <div style={{ color: '#666', textAlign: 'center', padding: 60, fontSize: 14 }}>{ui.noTasks}</div>}
          {unsaved && !autoSave && <div style={{ fontSize: 11, color: '#F5A623', textAlign: 'center', padding: 4 }}>⚠️ Есть несохранённые изменения</div>}
        </div>
        <div style={{ width: 350, borderLeft: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
          <ChatPanel messages={chatMessages} onMessagesChange={setMessages} isAuthenticated={isAuthenticated}
            onComplete={() => fetchTasks().then(setTasks).catch(() => {})} />
        </div>
      </div>
      <TaskModal task={selectedTask} isOpen={showModal} onClose={() => setShowModal(false)} onSave={handleTaskSave} />
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} onAuth={() => { setIsAuthenticated(true); setShowAuth(false); localStorage.setItem('gantt_auth', '1'); }} />
      {notification && <Notification message={notification} />}
    </div>
  );
}
