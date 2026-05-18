import { Task, TaskFormData } from '../types';
import TaskFormModal from './TaskFormModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (task: Task) => void;
}

export default function CreateTaskModal({ isOpen, onClose, onCreate }: Props) {
  const handleSave = (form: TaskFormData) => {
    if (!form.name) return;
    const today = new Date();
    const endDate = form.end_date || new Date(today.getTime() + 3 * 86400000).toISOString().split('T')[0];
    const startDate = form.start_date || today.toISOString().split('T')[0];

    const task: Task = {
      id: 'new',
      ...form,
      start_date: startDate,
      end_date: endDate,
      progress: form.progress || 0,
      dependencies: form.dependencies.split(',').map(s => s.trim()).filter(Boolean),
      project: form.assignee || 'General',
    };
    onCreate(task);
  };

  return (
    <TaskFormModal
      isOpen={isOpen}
      onClose={onClose}
      onSave={handleSave}
      mode="create"
      submitLabel="Создать"
    />
  );
}
