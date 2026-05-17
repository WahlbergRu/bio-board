import ViewSwitcher from './ViewSwitcher';
import ExcelHandler from './ExcelHandler';
import { ui } from '../i18n';

interface HeaderProps {
  viewMode: 'gantt' | 'kanban';
  zoomLevel: 'day' | 'week' | 'month' | 'quarter';
  onViewChange: (mode: 'gantt' | 'kanban') => void;
  onZoomChange: (z: 'day' | 'week' | 'month' | 'quarter') => void;
  onSeed: () => void;
  onCreateTask: () => void;
  onUpload: (count: number) => void;
  onExport: () => void;
  onExportIcal: () => void;
  onSave: () => void;
  onToggleAutoSave: () => void;
  autoSave: boolean;
  onLogin: () => void;
  onLogout: () => void;
  isAuthenticated: boolean;
}

export default function Header({
  viewMode, zoomLevel, onViewChange, onZoomChange,
  onSeed, onCreateTask, onUpload, onExport, onExportIcal, onSave,
  onToggleAutoSave, autoSave, onLogin, onLogout, isAuthenticated,
}: HeaderProps) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      padding: '10px 20px', background: '#1a1a2e',
      borderBottom: '1px solid #333', color: '#eee',
    }}>
      <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, whiteSpace: 'nowrap' }}>
        {ui.title}
      </h1>
      <ViewSwitcher currentMode={viewMode} onChange={onViewChange} />
      <select value={zoomLevel} onChange={e => onZoomChange(e.target.value as any)}
        style={{ padding: '4px 8px', background: '#2a2a4e', color: '#eee', border: '1px solid #444', borderRadius: 4, fontSize: 12 }}>
        <option value="day">{ui.viewDay}</option>
        <option value="week">{ui.viewWeek}</option>
        <option value="month">{ui.viewMonth}</option>
        <option value="quarter">{ui.viewQuarter}</option>
      </select>
      <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={onSave} className="btn btn-primary" title={ui.savePlan}>{ui.savePlan}</button>
        <button onClick={onToggleAutoSave} className="btn"
          style={{ color: autoSave ? '#7ED321' : '#888' }}>
          {autoSave ? ui.autoSaveOn : ui.autoSaveOff}
        </button>
        <button onClick={onCreateTask} className="btn btn-primary">➕ Задача</button>
        <ExcelHandler onUpload={onUpload} onExport={onExport} onExportIcal={onExportIcal} />
        <button onClick={onSeed} className="btn" title={ui.seedData}>{ui.seedData}</button>
        {isAuthenticated
          ? <button onClick={onLogout} className="btn">{ui.logout}</button>
          : <button onClick={onLogin} className="btn">{ui.login}</button>
        }
      </div>
    </header>
  );
}
