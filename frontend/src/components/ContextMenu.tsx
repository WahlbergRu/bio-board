import { useRef, useEffect } from 'react';

interface Task {
  id: string;
  name: string;
  assignee: string;
}

interface Props {
  position: { x: number; y: number } | null;
  task: Task | null;
  onClose: () => void;
  onAction: (action: string) => void;
}

export default function ContextMenu({ position, task, onClose, onAction }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!position || !task) return null;

  return (
    <div ref={menuRef} style={{
      position: 'fixed', left: position.x, top: position.y,
      background: '#1e1e3a', border: '1px solid #444', borderRadius: 8,
      padding: '4px 0', zIndex: 3000, minWidth: 150, boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
    }}>
      <div style={{ padding: '6px 12px', fontSize: 12, color: '#666', borderBottom: '1px solid #333' }}>{task.name}</div>
      <button onClick={() => onAction('copy')} style={menuItemStyle}>📋 Копировать</button>
      <button onClick={() => onAction('delete')} style={{ ...menuItemStyle, color: '#e74c3c' }}>🗑 Удалить</button>
      <div style={{ height: 1, background: '#333', margin: '4px 0' }} />
      <button onClick={() => onAction('shift_back')} style={menuItemStyle}>⏪ Сдвинуть назад</button>
      <button onClick={() => onAction('shift_fwd')} style={menuItemStyle}>⏩ Сдвинуть вперед</button>
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '8px 12px', background: 'none', border: 'none',
  color: '#eee', textAlign: 'left', fontSize: 13, cursor: 'pointer'
};
