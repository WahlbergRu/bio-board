import { ui } from '../i18n';

interface Props {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ isOpen, onConfirm, onCancel }: Props) {
  if (!isOpen) return null;
  return (
    <div style={overlay} onClick={onCancel}>
      <div style={card} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 12px', fontSize: 16, color: '#eee' }}>{ui.clearAllConfirm}</h2>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#999' }}>{ui.clearAllConfirmDesc}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} className="btn">{ui.cancel}</button>
          <button onClick={onConfirm} className="btn btn-danger">{ui.clearAll}</button>
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const card: React.CSSProperties = {
  background: '#1e1e3a', borderRadius: 12, padding: 20, width: '90%',
  maxWidth: 360, border: '1px solid #333',
};
