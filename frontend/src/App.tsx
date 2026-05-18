import { useEffect, useState } from 'react';
import { useStore } from './store';
import { exportExcel, exportIcal } from './api/excel';
import { login, setAuthToken, clearAuthToken } from './api/auth';
import { generateDemoTasks } from './data/demoTasks';
import Header from './components/Header';
import GanttView from './components/GanttView';
import KanbanView from './components/KanbanView';
import ChatPanel from './components/ChatPanel';
import TaskModal from './components/TaskModal';
import AuthModal from './components/AuthModal';
import Notification from './components/Notification';
import CreateTaskModal from './components/CreateTaskModal';
import ContextMenu from './components/ContextMenu';
import ConfirmModal from './components/ConfirmModal';
import SettingsModal from './components/SettingsModal';
import { Task } from './types';
import { ui } from './i18n';
import { useAppActions } from './hooks/useAppActions';

export default function App() {
  const { tasks, chatMessages, selectedTask, viewMode, setTasks, setSelectedTask, setViewMode } = useStore();
  const { notification, unsaved, setUnsaved, notify, refreshTasks, runCommand, handleTaskUpdate } = useAppActions();

  const [zoomLevel, setZoomLevel] = useState<'day' | 'week' | 'month' | 'quarter'>('week');
  const [showAuth, setShowAuth] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; task: Task } | null>(null);

  // Init: load auth state + fetch from backend
  useEffect(() => {
    if (localStorage.getItem('gantt_auth')) setIsAuthenticated(true);
    refreshTasks();
  }, [refreshTasks]);

  const handleTaskSave = (t: Task) => {
    handleTaskUpdate(t);
    setShowModal(false);
    setUnsaved(true);
  };

  const handleReassign = (id: string, assignee: string) => {
    useStore.getState().updateTask(id, { assignee });
    setUnsaved(true);
  };

  const handleContextMenu = (task: Task, e: MouseEvent | React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, task });
  };

  const handleContextAction = async (action: string) => {
    if (!contextMenu) return;
    const task = contextMenu.task;
    setContextMenu(null);

    const commands: Record<string, string> = {
      copy: `Скопируй задачу ${task.name}`,
      delete: `Удали задачу ${task.name}`,
      shift_fwd: `Сдвинь задачу ${task.name} на 1 день вперед`,
      shift_back: `Сдвинь задачу ${task.name} на 1 день назад`,
    };
    const cmd = commands[action];
    if (cmd) {
      await runCommand(cmd);
      if (action === 'copy') notify(`Задача "${task.name}" скопирована`);
      if (action === 'delete') notify(`Задача "${task.name}" удалена`);
    }
  };

  const handleCreateTask = async (task: Task) => {
    const days = Math.ceil((new Date(task.end_date).getTime() - new Date(task.start_date).getTime()) / 86400000) || 3;
    await runCommand(`Добавь задачу ${task.name} на ${days} дней с исполнителем ${task.assignee || 'Unassigned'}`);
    notify(`Задача "${task.name}" создана`);
  };

  const handleSeed = () => {
    const demoTasks = generateDemoTasks();
    setTasks(demoTasks);
    // Also push to backend for persistence
    demoTasks.forEach(task => {
      import('./api/client').then(({ client }) => {
        client.post('/tasks/', task).catch(() => {});
      });
    });
  };

  const handleUpload = (count: number) => {
    refreshTasks();
    notify(ui.uploadSuccess.replace('{count}', String(count)));
  };

  const handleExport = () => { exportExcel(); notify(ui.exportSuccess); };
  const handleExportIcal = () => { exportIcal(tasks); notify(ui.exportSuccess); };

  const handleLogin = () => setShowAuth(true);
  const handleLogout = () => { clearAuthToken(); setIsAuthenticated(false); };

  const handleClearAll = async () => {
    try {
      const { client } = await import('./api/client');
      await client.delete('/plan/reset');
      setTasks([]);
      localStorage.removeItem('gantt_plan');
      setUnsaved(false);
      notify(ui.clearAllDone);
    } catch {
      notify(ui.saveError);
    }
    setShowConfirmClear(false);
  };

  const handleAuth = async (username: string, password: string) => {
    try {
      const { access_token } = await login(username, password);
      setAuthToken(access_token);
      setIsAuthenticated(true);
      setShowAuth(false);
    } catch {
      notify(ui.loginError);
    }
  };

  return (
    <div className="app-root" onClick={() => setContextMenu(null)}>
      <Header
        viewMode={viewMode} zoomLevel={zoomLevel} onViewChange={setViewMode} onZoomChange={setZoomLevel}
        onSeed={handleSeed} onUpload={handleUpload} onExport={handleExport} onExportIcal={handleExportIcal}
        onToggleAutoSave={() => useStore.getState().setAutoSave(!useStore.getState().autoSave)}
        autoSave={useStore.getState().autoSave}
        onLogin={handleLogin} onLogout={handleLogout} onClearAll={() => setShowConfirmClear(true)}
        onSettings={() => setShowSettings(true)} isAuthenticated={isAuthenticated}
        onCreateTask={() => setShowCreateModal(true)}
      />
      <div className="app-main">
        <div className="app-content">
          {viewMode === 'gantt'
            ? <GanttView tasks={tasks} onTaskClick={t => { setSelectedTask(t); setShowModal(true); }} onTaskUpdate={handleTaskUpdate} onContextMenu={handleContextMenu} zoom={zoomLevel} />
            : <KanbanView tasks={tasks} onTaskClick={t => { setSelectedTask(t); setShowModal(true); }} onReassign={handleReassign} />
          }
          {tasks.length === 0 && <div className="empty-state">{ui.noTasks}</div>}
          {unsaved && <div className="unsaved-warning">⚠️ Есть несохранённые изменения</div>}
        </div>
        <div className="app-sidebar">
           <ChatPanel messages={chatMessages} onMessagesChange={m => useStore.getState().setMessages(m)}
            isAuthenticated={isAuthenticated} onComplete={refreshTasks} />
        </div>
      </div>

      <TaskModal task={selectedTask} isOpen={showModal} onClose={() => setShowModal(false)} onSave={handleTaskSave} allTasks={tasks} />
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} onAuth={handleAuth} />
      <CreateTaskModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={handleCreateTask} />
      <ContextMenu position={contextMenu ? { x: contextMenu.x, y: contextMenu.y } : null}
        task={contextMenu?.task || null} onClose={() => setContextMenu(null)} onAction={handleContextAction} />
      <ConfirmModal isOpen={showConfirmClear} onConfirm={handleClearAll} onCancel={() => setShowConfirmClear(false)} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} onSave={() => {}} />
      {notification && <Notification message={notification} />}
    </div>
  );
}
