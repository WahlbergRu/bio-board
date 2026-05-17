import { useRef, useState } from 'react';
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
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input ref={ref} type="file" hidden accept=".xlsx,.xls" onChange={handleFile} />
      <button onClick={() => ref.current?.click()} disabled={loading} className="btn">
        {loading ? ui.parsing : ui.uploadExcel}
      </button>
      <button onClick={onExport} className="btn">{ui.exportExcel}</button>
      <button onClick={onExportIcal} className="btn">{ui.exportIcal}</button>
      {progress && <span style={{ fontSize: 10, color: '#7ED321' }}>{progress}</span>}
    </div>
  );
}
