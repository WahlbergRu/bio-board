import { useState, useEffect } from 'react';
import { getLLMSettings, updateLLMSettings } from '../api/settings';
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
    getLLMSettings()
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
      const body: Record<string, string> = {};
      if (baseUrl) body.base_url = baseUrl;
      if (apiKey) body.api_key = apiKey;
      if (model) body.model = model;

      await updateLLMSettings(body);
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 20px', fontSize: 16, color: '#eee' }}>{ui.settingsTitle}</h2>

        <FormField label={ui.settingsBaseUrl} hint={ui.settingsBaseUrlHint}>
          <input className="form-input" value={baseUrl} onChange={e => setBaseUrl(e.target.value)}
            placeholder="https://api.openai.com/v1" />
        </FormField>

        <FormField label={ui.settingsApiKey} hint={ui.settingsApiKeyHint}>
          <div style={{ display: 'flex', gap: 4 }}>
            <input className="form-input" type={showKey ? 'text' : 'password'} value={apiKey}
              onChange={e => setApiKey(e.target.value)} placeholder="sk-..." style={{ flex: 1 }} />
            <button type="button" className="btn btn-ghost" style={{ padding: '0 10px', fontSize: 12 }}
              onClick={() => setShowKey(!showKey)}
              title={showKey ? ui.settingsHideKey : ui.settingsShowKey}>
              {showKey ? '🙈' : '👁'}
            </button>
          </div>
        </FormField>

        <FormField label={ui.settingsModel} hint={ui.settingsModelHint}>
          <input className="form-input" value={model} onChange={e => setModel(e.target.value)}
            placeholder="kimi-k2.5" />
        </FormField>

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

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
      {hint && <span style={{ fontSize: 10, color: '#666' }}>{hint}</span>}
    </div>
  );
}
