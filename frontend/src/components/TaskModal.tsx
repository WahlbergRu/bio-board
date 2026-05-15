import { useState, useEffect } from 'react';
import type { Task, TaskFormData } from '../types';

interface TaskModalProps {
  task: Task;
  onSave: (id: string, data: Partial<TaskFormData>) => void;
  onClose: () => void;
}

export default function TaskModal({ task, onSave, onClose }: TaskModalProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<TaskFormData>({
    name: task.name, description: task.description,
    start_date: task.start_date, end_date: task.end_date,
    progress: task.progress, type: task.type,
    assignee: task.assignee, dependencies: task.dependencies.join(', '),
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSave = () => {
    onSave(task.id, form);
    setEditing(false);
  };

  const field: React.CSSProperties = {
    width: '100%', padding: '6px 10px', background: '#2a2a44', border: '1px solid #444',
    borderRadius: 6, color: '#eee', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  };

  const label: React.CSSProperties = { fontSize: 12, color: '#999', marginBottom: 4, display: 'block' };

  const row = (lbl: string, key: keyof TaskFormData, type = 'text') => (
    <div>
      <span style={label}>{lbl}</span>
      {editing ? (
        type === 'textarea' ? <textarea rows={3} style={{ ...field, resize: 'vertical' }} value={form[key] as string} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /> :
        type === 'range' ? <input type="range" min={0} max={100} value={form[key] as number} onChange={(e) => setForm({ ...form, [key]: +e.target.value })} style={{ width: '100%' }} /> :
        <input type={type} style={field} value={form[key] as string | number} onChange={(e) => setForm({ ...form, [key]: type === 'number' ? +e.target.value : e.target.value })} />
      ) : (
        <div style={{ color: '#ddd', fontSize: 13 }}>{key === 'progress' ? `${task.progress}%` : String(form[key])}</div>
      )}
    </div>
  );

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#1a1a2e', borderRadius: 12, padding: 24, width: 480,
        maxHeight: '80vh', overflowY: 'auto', color: '#eee',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>{editing ? 'Edit Task' : task.name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {row('Name', 'name')}
          {row('Description', 'description', 'textarea')}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>{row('Start', 'start_date', 'date')}</div>
            <div style={{ flex: 1 }}>{row('End', 'end_date', 'date')}</div>
          </div>
          {row('Progress', 'progress', 'range')}
          {row('Assignee', 'assignee')}
          {row('Type', 'type')}
          {row('Dependencies (comma-sep IDs)', 'dependencies')}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} style={btnCancel}>Cancel</button>
              <button onClick={handleSave} style={btnSave}>Save</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} style={btnSave}>Edit</button>
          )}
        </div>
      </div>
    </div>
  );
}

const btnSave: React.CSSProperties = {
  padding: '8px 20px', background: '#4A90D9', color: '#fff', border: 'none',
  borderRadius: 6, cursor: 'pointer', fontSize: 13,
};
const btnCancel: React.CSSProperties = {
  padding: '8px 20px', background: '#333', color: '#aaa', border: '1px solid #444',
  borderRadius: 6, cursor: 'pointer', fontSize: 13,
};
