import { useState } from 'react';
import { ui } from '../i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAuth: () => void;
}

export default function AuthModal({ isOpen, onClose, onAuth }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) throw new Error('Auth failed');
      const data = await res.json();
      localStorage.setItem('gantt_token', data.access_token);
      onAuth();
    } catch {
      setError(ui.loginError);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={onClose}>
      <form onSubmit={handleSubmit} style={{ background: '#1e1e3a', borderRadius: 12, padding: 24, width: 300, border: '1px solid #333' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16, color: '#eee' }}>{ui.loginTitle}</h2>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>{ui.username}</label>
          <input value={username} onChange={e => setUsername(e.target.value)} style={{ width: '100%', padding: '6px 10px', background: '#1a1a2e', border: '1px solid #444', borderRadius: 4, color: '#eee', boxSizing: 'border-box' }} autoComplete="username" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>{ui.password}</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '6px 10px', background: '#1a1a2e', border: '1px solid #444', borderRadius: 4, color: '#eee', boxSizing: 'border-box' }} autoComplete="current-password" />
        </div>
        {error && <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} className="btn">{ui.cancel}</button>
          <button type="submit" className="btn btn-primary">{ui.login}</button>
        </div>
      </form>
    </div>
  );
}
