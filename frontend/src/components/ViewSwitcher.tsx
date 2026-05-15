import { ui } from '../i18n';

interface Props {
  currentMode: 'gantt' | 'kanban';
  onChange: (mode: 'gantt' | 'kanban') => void;
}

export default function ViewSwitcher({ currentMode, onChange }: Props) {
  const tabs: { key: 'gantt' | 'kanban'; label: string }[] = [
    { key: 'gantt', label: ui.gantt },
    { key: 'kanban', label: ui.kanban },
  ];
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)}
          style={{
            padding: '4px 12px', border: 'none', borderRadius: 4,
            background: currentMode === t.key ? '#4A90D9' : 'transparent',
            color: currentMode === t.key ? '#fff' : '#999',
            cursor: 'pointer', fontSize: 12, fontWeight: 500,
          }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
