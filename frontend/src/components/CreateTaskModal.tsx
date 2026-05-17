import { useState } from 'react';
import { Task, TaskFormData } from '../types';
import { ui } from '../i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (task: Task) => void;
}

const typeLabels: Record<string, string> = { task: ui.taskTypeTask, milestone: ui.taskTypeMilestone, project: ui.taskTypeProject };

export default function CreateTaskModal({ isOpen, onClose, onCreate }: Props) {
  const [form, setForm] = useState<TaskFormData>({
    name: '', description: '', start_date: '', end_date: '', progress: 0,
    type: 'task', assignee: '', dependencies: '',
  });

  if (!isOpen) return null;

  const handleSave = () => {
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
    setForm({ name: '', description: '', start_date: '', end_date: '', progress: 0, type: 'task', assignee: '', dependencies: '' });
    onClose();
  };

  const field = (label: string, field: keyof TaskFormData, type = 'text') => (
    <div style={{ marginBottom: 8 }}>
      <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 2 }}>{label}</label>
      {type === 'number'
        ? <input type="number" min={0} max={100} value={form[field] as number}
            onChange={e => setForm(f => ({ ...f, [field]: +e.target.value }))}
            style={inputStyle} />
        : field === 'type'
          ? <select value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value as TaskFormData['type'] }))} style={inputStyle}>
              {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          : <input type={type} value={form[field] as string}
              onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              style={inputStyle} />
      }
    </div>
  );

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, color: '#eee' }}>{ui.taskDetails}</h2>
          <button onClick={onClose} className="btn" style={{ fontSize: 11, padding: '4px 10px' }}>{ui.close}</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
          {field(ui.name, 'name')}
          {field(ui.assignee, 'assignee')}
          <div style={{ gridColumn: '1 / -1' }}>{field(ui.description, 'description')}</div>
          {field(ui.startDate, 'start_date', 'date')}
          {field(ui.endDate, 'end_date', 'date')}
          {field(ui.progress, 'progress', 'number')}
          {field(ui.type, 'type')}
          <div style={{ gridColumn: '1 / -1' }}>{field(ui.dependencies, 'dependencies')}</div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn">{ui.cancel}</button>
          <button onClick={handleSave} className="btn btn-primary">{ui.save}</button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '4px 8px', background: '#1a1a2e', border: '1px solid #444', borderRadius: 4, color: '#eee', fontSize: 13, boxSizing: 'border-box' };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const card: React.CSSProperties = { background: '#1e1e3a', borderRadius: 12, padding: 20, width: '90%', maxWidth: 500, maxHeight: '80vh', overflowY: 'auto', border: '1px solid #333' };
