import { useState, useEffect, useMemo, useRef } from 'react';
import { Task, TaskFormData } from '../types';
import { ui } from '../i18n';

interface Props {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  allTasks?: Task[];
}

const EMPTY_TASKS: Task[] = [];

const typeLabels: Record<string, string> = { task: ui.taskTypeTask, milestone: ui.taskTypeMilestone, project: ui.taskTypeProject };

export default function TaskModal({ task, isOpen, onClose, onSave, allTasks = EMPTY_TASKS }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<TaskFormData>({ name: '', description: '', start_date: '', end_date: '', progress: 0, type: 'task', assignee: '', dependencies: '' });
  const prevTaskIdRef = useRef<string | null>(null);

  const taskInfoMap = useMemo(() => {
    const m = new Map<string, { id: string; name: string }>();
    allTasks.forEach(t => m.set(t.id, { id: t.id, name: t.name }));
    return m;
  }, [allTasks]);

  useEffect(() => {
    if (task && task.id !== prevTaskIdRef.current) {
      prevTaskIdRef.current = task.id;
      const depLabels = task.dependencies.map(id => {
        const info = taskInfoMap.get(id);
        return info ? `${info.id} — ${info.name}` : id;
      });
      setForm({ ...task, dependencies: depLabels.join(', ') });
      setEditing(false);
    }
  }, [task, taskInfoMap]);

  if (!isOpen || !task) return null;

  const handleSave = () => {
    const depIds = form.dependencies.split(',').map(s => s.trim()).filter(Boolean).map(raw => {
      // Try "ID — Name" format: extract ID
      const idMatch = raw.match(/^(\d+)\s*[—-]/);
      if (idMatch) {
        return idMatch[1];
      }
      // Try plain ID
      if (/^\d+$/.test(raw)) {
        return raw;
      }
      // Try name lookup
      const found = allTasks.find(t => t.name.toLowerCase() === raw.toLowerCase());
      return found ? found.id : raw;
    });
    const updated: Task = {
      ...task, ...form,
      dependencies: depIds,
    };
    onSave(updated);
    setEditing(false);
  };

  const field = (label: string, field: keyof TaskFormData, type = 'text') => (
    <div style={{ marginBottom: 8 }}>
      <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 2 }}>{label}</label>
      {editing
        ? type === 'number'
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
        : <div style={{ fontSize: 13, color: '#eee' }}>{field === 'type' ? typeLabels[form[field]] : (form[field] || '—')}</div>
      }
    </div>
  );

  return (
    <div style={overlay} onClick={editing ? undefined : onClose}>
      <div style={card} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, color: '#eee' }}>{ui.taskDetails}</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            {!editing && <button onClick={() => setEditing(true)} className="btn btn-primary" style={{ fontSize: 11, padding: '4px 10px' }}>{ui.editTask}</button>}
            <button onClick={onClose} className="btn" style={{ fontSize: 11, padding: '4px 10px' }}>{ui.close}</button>
          </div>
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
        {editing && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setEditing(false)} className="btn">{ui.cancel}</button>
            <button onClick={handleSave} className="btn btn-primary">{ui.save}</button>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '4px 8px', background: '#1a1a2e', border: '1px solid #444', borderRadius: 4, color: '#eee', fontSize: 13, boxSizing: 'border-box' };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const card: React.CSSProperties = { background: '#1e1e3a', borderRadius: 12, padding: 20, width: '90%', maxWidth: 500, maxHeight: '80vh', overflowY: 'auto', border: '1px solid #333' };
