import { useRef, useState, useEffect } from 'react';
import { uploadExcel } from '../api/excel';
import { ui } from '../i18n';

interface Props {
  onUpload: (count: number) => void;
  onExport: () => void;
  onExportIcal: () => void;
}

export default function ExcelHandler({ onUpload, onExport, onExportIcal }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [exportOpen, setExportOpen] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.export-dropdown')) setExportOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportOpen]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setProgress(ui.parsing);
    try {
      const result = await uploadExcel(file);
      setProgress(ui.uploadSuccess.replace('{count}', String(result.count)));
      onUpload(result.count);
    } catch {
      setProgress(ui.uploadError);
    } finally {
      setLoading(false);
      if (ref.current) ref.current.value = '';
      setTimeout(() => setProgress(''), 3000);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', position: 'relative' }}>
      <input ref={ref} type="file" hidden accept=".xlsx,.xls" onChange={handleFile} />
      <button onClick={() => ref.current?.click()} disabled={loading} className="btn">
        {loading ? ui.parsing : ui.uploadExcel}
      </button>

      {/* Export Dropdown */}
      <div className="export-dropdown" style={{ position: 'relative' }}>
        <button onClick={() => setExportOpen(!exportOpen)} className="btn">
           Экспорт ▾
        </button>
        {exportOpen && (
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 4,
            background: '#16213e', border: '1px solid #2a2a4a', borderRadius: 6,
            minWidth: 140, zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}>
            <button onClick={() => { onExport(); setExportOpen(false); }}
              style={{
                display: 'block', width: '100%', padding: '8px 14px', border: 'none',
                background: 'transparent', color: '#eee', fontSize: 13, textAlign: 'left',
                cursor: 'pointer', borderBottom: '1px solid #2a2a4a',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1a1a2e')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              📊 Excel
            </button>
            <button onClick={() => { onExportIcal(); setExportOpen(false); }}
              style={{
                display: 'block', width: '100%', padding: '8px 14px', border: 'none',
                background: 'transparent', color: '#eee', fontSize: 13, textAlign: 'left',
                cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1a1a2e')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              📅 iCal
            </button>
          </div>
        )}
      </div>

      {progress && <span style={{ fontSize: 10, color: '#7ED321' }}>{progress}</span>}
    </div>
  );
}
