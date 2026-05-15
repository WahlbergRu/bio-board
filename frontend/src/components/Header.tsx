import ViewSwitcher from './ViewSwitcher';
import ExcelHandler from './ExcelHandler';

interface HeaderProps {
  viewMode: 'gantt' | 'kanban';
  onViewChange: (mode: 'gantt' | 'kanban') => void;
  onSeed: () => void;
  onUploaded: () => void;
}

export default function Header({ viewMode, onViewChange, onSeed, onUploaded }: HeaderProps) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '10px 20px', background: '#1a1a2e',
      borderBottom: '1px solid #333', color: '#eee',
    }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, whiteSpace: 'nowrap' }}>
        AI Gantt Planner
      </h1>
      <ViewSwitcher currentMode={viewMode} onChange={onViewChange} />
      <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
        <ExcelHandler onUploaded={onUploaded} />
        <button
          onClick={onSeed}
          style={{
            padding: '6px 14px', background: '#2a6a3e', color: '#ccc',
            border: '1px solid #444', borderRadius: 6, cursor: 'pointer', fontSize: 13,
          }}
        >
          🌱 Seed Data
        </button>
      </div>
    </header>
  );
}
