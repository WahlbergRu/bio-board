import { useState, useEffect } from 'react';
import { ui } from '../i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function SettingsModal({ isOpen, onClose, onSave }: Props) {
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setSuccess('');
    fetch('/api/settings/llm')
      .then(r => r.json())
      .then(data => {
        setBaseUrl(data.base_url || '');
        setApiKey('');
        setModel(data.model || '');
      })
      .catch(() => setError(ui.settingsLoadError));
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const body: Record<string, string | null> = {};
      if (baseUrl) body.base_url = baseUrl;
      if (apiKey) body.api_key = apiKey;
      if (model) body.model = model;

      const res = await fetch('/api/settings/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Save failed');
      setSuccess(ui.settingsSaveSuccess);
      onSave();
      setTimeout(() => { setSuccess(''); onClose(); }, 800);
    } catch {
      setError(ui.settingsSaveError);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={onClose}>
      <div style={{ background: '#1e1e3a', borderRadius: 12, padding: 24, width: 420, border: '1px solid #333' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 20px', fontSize: 16, color: '#eee' }}>{ui.settingsTitle}</h2>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>{ui.settingsBaseUrl}</label>
          <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
            style={{ width: '100%', padding: '8px 10px', background: '#1a1a2e', border: '1px solid #444', borderRadius: 4, color: '#eee', boxSizing: 'border-box', fontSize: 13 }} />
          <span style={{ fontSize: 10, color: '#666' }}>{ui.settingsBaseUrlHint}</span>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>{ui.settingsApiKey}</label>
          <div style={{ display: 'flex', gap: 4 }}>
            <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)}
              placeholder="sk-..."
              style={{ flex: 1, padding: '8px 10px', background: '#1a1a2e', border: '1px solid #444', borderRadius: 4, color: '#eee', boxSizing: 'border-box', fontSize: 13 }} />
            <button type="button" onClick={() => setShowKey(!showKey)}
              style={{ padding: '0 10px', background: '#2a2a4e', border: '1px solid #444', borderRadius: 4, color: '#aaa', cursor: 'pointer', fontSize: 12 }}
              title={showKey ? ui.settingsHideKey : ui.settingsShowKey}>
              {showKey ? '🙈' : '👁'}
            </button>
          </div>
          <span style={{ fontSize: 10, color: '#666' }}>{ui.settingsApiKeyHint}</span>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>{ui.settingsModel}</label>
          <input value={model} onChange={e => setModel(e.target.value)}
            placeholder="kimi-k2.5"
            style={{ width: '100%', padding: '8px 10px', background: '#1a1a2e', border: '1px solid #444', borderRadius: 4, color: '#eee', boxSizing: 'border-box', fontSize: 13 }} />
          <span style={{ fontSize: 10, color: '#666' }}>{ui.settingsModelHint}</span>
        </div>

        {error && <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 12 }}>{error}</div>}
        {success && <div style={{ color: '#7ED321', fontSize: 12, marginBottom: 12 }}>{success}</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn" disabled={saving}>{ui.cancel}</button>
          <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
            {saving ? ui.settingsSaving : ui.save}
          </button>
        </div>
      </div>
    </div>
  );
}
