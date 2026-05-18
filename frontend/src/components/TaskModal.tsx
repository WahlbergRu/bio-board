import { Task, TaskFormData, parseDependencyIds } from '../types';
import TaskFormModal from './TaskFormModal';

interface Props {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  allTasks?: Task[];
}

/** TaskModal — thin wrapper around shared TaskFormModal with dependency resolution */
export default function TaskModal({ task, isOpen, onClose, onSave, allTasks = [] }: Props) {
  const handleSave = (form: TaskFormData) => {
    if (!task) return;
    onSave({ ...task, ...form, dependencies: parseDependencyIds(form.dependencies, allTasks) });
  };

  // Map dependency IDs to readable labels for display
  const displayTask = task ? {
    ...task,
    dependencies: task.dependencies.map(id => {
      const info = allTasks.find(t => t.id === id);
      return info ? `${info.id} — ${info.name}` : id;
    }),
  } : null;

  return (
    <TaskFormModal
      isOpen={isOpen}
      onClose={onClose}
      onSave={handleSave}
      initialTask={displayTask}
      mode="edit"
    />
  );
}
