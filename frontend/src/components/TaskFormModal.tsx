import { useState, useEffect } from 'react';
import { Task, TaskFormData } from '../types';
import { ui } from '../i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: TaskFormData) => void;
  initialTask?: Task | null;
  mode?: 'edit' | 'create';
  submitLabel?: string;
}

const typeLabels: Record<string, string> = {
  task: ui.taskTypeTask,
  milestone: ui.taskTypeMilestone,
  project: ui.taskTypeProject,
};

const EMPTY_FORM: TaskFormData = {
  name: '', description: '', start_date: '', end_date: '',
  progress: 0, type: 'task', assignee: '', dependencies: '',
};

export default function TaskFormModal({
  isOpen, onClose, onSave, initialTask, mode = 'edit', submitLabel,
}: Props) {
  const [form, setForm] = useState<TaskFormData>(EMPTY_FORM);
  const [editing, setEditing] = useState(mode === 'create');

  const isCreate = mode === 'create';

  useEffect(() => {
    if (!isOpen) return;
    if (initialTask) {
      const depLabels = initialTask.dependencies.map(id => `${id} — ${initialTask.name}`);
      setForm({ ...initialTask, dependencies: depLabels.join(', ') });
      setEditing(false);
    } else if (isCreate) {
      setForm(EMPTY_FORM);
      setEditing(true);
    }
  }, [isOpen, initialTask, isCreate]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(form);
    if (!isCreate) setEditing(false);
    setForm(EMPTY_FORM);
  };

  const handleCancel = () => {
    if (isCreate) {
      setForm(EMPTY_FORM);
    } else {
      setEditing(false);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={isCreate ? onClose : editing ? undefined : onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, color: '#eee' }}>
            {isCreate ? 'Создать задачу' : ui.taskDetails}
          </h2>
          <div style={{ display: 'flex', gap: 6 }}>
            {!isCreate && !editing && (
              <button onClick={() => setEditing(true)} className="btn btn-primary" style={{ fontSize: 11, padding: '4px 10px' }}>
                {ui.editTask}
              </button>
            )}
            <button onClick={handleCancel} className="btn" style={{ fontSize: 11, padding: '4px 10px' }}>{ui.close}</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
          <Field label={ui.name} value={form.name} editing={editing || isCreate}
            onChange={v => setForm(f => ({ ...f, name: v }))} />
          <Field label={ui.assignee} value={form.assignee} editing={editing || isCreate}
            onChange={v => setForm(f => ({ ...f, assignee: v }))} />
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label={ui.description} value={form.description} editing={editing || isCreate}
              onChange={v => setForm(f => ({ ...f, description: v }))} />
          </div>
          <Field label={ui.startDate} value={form.start_date} editing={editing || isCreate} type="date"
            onChange={v => setForm(f => ({ ...f, start_date: v }))} />
          <Field label={ui.endDate} value={form.end_date} editing={editing || isCreate} type="date"
            onChange={v => setForm(f => ({ ...f, end_date: v }))} />
          <Field label={ui.progress} value={String(form.progress)} editing={editing || isCreate} type="number"
            onChange={v => setForm(f => ({ ...f, progress: +v || 0 }))} />
          <TypeField value={form.type} editing={editing || isCreate}
            onChange={v => setForm(f => ({ ...f, type: v as TaskFormData['type'] }))} />
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label={ui.dependencies} value={form.dependencies} editing={editing || isCreate}
              onChange={v => setForm(f => ({ ...f, dependencies: v }))} />
          </div>
        </div>

        {(editing || isCreate) && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={handleCancel} className="btn">{ui.cancel}</button>
            <button onClick={handleSave} className="btn btn-primary">
              {submitLabel || ui.save}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Field Components ─────────────────────────────────────────────

function Field({ label, value, editing, type = 'text', onChange }: {
  label: string; value: string; editing: boolean; type?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 2 }}>{label}</label>
      {editing
        ? <input className="form-input" type={type} value={value}
            min={type === 'number' ? 0 : undefined} max={type === 'number' ? 100 : undefined}
            onChange={e => onChange(e.target.value)} />
        : <div style={{ fontSize: 13, color: '#eee' }}>{value || '—'}</div>
      }
    </div>
  );
}

function TypeField({ value, editing, onChange }: {
  value: string; editing: boolean; onChange: (v: string) => void;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 2 }}>{ui.type}</label>
      {editing
        ? <select className="form-input" value={value} onChange={e => onChange(e.target.value)}>
            {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        : <div style={{ fontSize: 13, color: '#eee' }}>{typeLabels[value] || value}</div>
      }
    </div>
  );
}
