interface ViewSwitcherProps {
  currentMode: 'gantt' | 'kanban';
  onChange: (mode: 'gantt' | 'kanban') => void;
}

const btn: React.CSSProperties = {
  padding: '6px 18px', border: 'none', cursor: 'pointer',
  fontSize: 13, fontWeight: 600, borderRadius: 6, transition: 'all 0.15s',
};

const active: React.CSSProperties = { ...btn, background: '#4A90D9', color: '#fff' };
const inactive: React.CSSProperties = { ...btn, background: '#2a2a3e', color: '#aaa' };

export default function ViewSwitcher({ currentMode, onChange }: ViewSwitcherProps) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <button style={currentMode === 'gantt' ? active : inactive} onClick={() => onChange('gantt')}>
        Gantt
      </button>
      <button style={currentMode === 'kanban' ? active : inactive} onClick={() => onChange('kanban')}>
        Kanban
      </button>
    </div>
  );
}
