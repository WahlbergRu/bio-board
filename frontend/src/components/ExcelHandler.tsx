import { useRef, useState } from 'react';
import { uploadExcel, exportExcel } from '../api/excel';

export default function ExcelHandler({ onUploaded }: { onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      await uploadExcel(file);
      onUploaded();
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try { await exportExcel(); }
    catch (err) { console.error('Export failed', err); }
    finally { setLoading(false); }
  };

  const btn: React.CSSProperties = {
    padding: '6px 14px', background: '#2a2a3e', color: '#ccc',
    border: '1px solid #444', borderRadius: 6, cursor: 'pointer', fontSize: 13,
  };

  return (
    <>
      <input ref={inputRef} type="file" accept=".xlsx" hidden onChange={handleFile} />
      <button style={btn} onClick={() => inputRef.current?.click()} disabled={loading}>
        {loading ? '⏳' : '📥'} Import
      </button>
      <button style={btn} onClick={handleExport} disabled={loading}>
        {loading ? '⏳' : '📤'} Export
      </button>
    </>
  );
}
