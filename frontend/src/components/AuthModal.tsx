import { useState } from 'react';
import { ui } from '../i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAuth: (username: string, password: string) => void;
}

export default function AuthModal({ isOpen, onClose, onAuth }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) {
      setError(ui.loginError);
      return;
    }
    onAuth(username, password);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-card auth-card" onSubmit={handleSubmit} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16, color: '#eee' }}>{ui.loginTitle}</h2>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>{ui.username}</label>
          <input value={username} onChange={e => setUsername(e.target.value)} className="form-input" autoComplete="username" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>{ui.password}</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="form-input" autoComplete="current-password" />
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
