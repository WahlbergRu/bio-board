import { useState } from 'react';
import { ui } from '../i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (task: any) => void;
}

export default function CreateTaskModal({ isOpen, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [assignee, setAssignee] = useState('');
  const [days, setDays] = useState('3');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onCreate({ name, assignee, days: parseInt(days, 10) || 3 });
    setName(''); setAssignee(''); setDays('3');
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={onClose}>
      <form onSubmit={handleSubmit} style={{ background: '#1e1e3a', borderRadius: 12, padding: 24, width: 300, border: '1px solid #333' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16, color: '#eee' }}>{ui.seedData}</h2>
        
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>{ui.name}</label>
          <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '6px 10px', background: '#1a1a2e', border: '1px solid #444', borderRadius: 4, color: '#eee', boxSizing: 'border-box' }} autoFocus required />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>{ui.assignee}</label>
          <input value={assignee} onChange={e => setAssignee(e.target.value)} style={{ width: '100%', padding: '6px 10px', background: '#1a1a2e', border: '1px solid #444', borderRadius: 4, color: '#eee', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>{ui.viewDay} (duration)</label>
          <input type="number" value={days} onChange={e => setDays(e.target.value)} style={{ width: '100%', padding: '6px 10px', background: '#1a1a2e', border: '1px solid #444', borderRadius: 4, color: '#eee', boxSizing: 'border-box' }} />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} className="btn">{ui.cancel}</button>
          <button type="submit" className="btn btn-primary">{ui.save}</button>
        </div>
      </form>
    </div>
  );
}
