import { useEffect, useRef, useState } from 'react';
import { COMMANDS, CommandDef } from '../data/commands';

interface Props {
  visible: boolean;
  filterText: string;
  onSelect: (template: string) => void;
  onClose: () => void;
}

const HINT = '↑↓ навигация · Tab/Enter выбрать · Esc закрыть';

export default function CommandOverlay({ visible, filterText, onSelect, onClose }: Props) {
  const [highlighted, setHighlighted] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Filter commands by keyword match or label match
  const filtered = filterText.trim()
    ? COMMANDS.filter((c) =>
        c.label.toLowerCase().includes(filterText.toLowerCase()) ||
        c.keywords.some((k) => k.toLowerCase().includes(filterText.toLowerCase()))
      )
    : COMMANDS;

  // Reset highlight when filter or visibility changes
  useEffect(() => {
    setHighlighted(0);
  }, [filterText, visible]);

  // Close on outside click
  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid immediate close from the click that opened it
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [visible, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlighted((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlighted((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filtered[highlighted]) {
          onSelect(filtered[highlighted].template);
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [visible, filtered, highlighted, onSelect, onClose]);

  if (!visible || filtered.length === 0) return null;

  const handleSelect = (cmd: CommandDef) => () => onSelect(cmd.template);

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        marginBottom: 6,
        background: '#1a1a3a',
        border: '1px solid #444',
        borderRadius: 10,
        padding: '8px 0',
        zIndex: 100,
        maxHeight: 280,
        overflowY: 'auto',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
      }}
    >
      {filtered.map((cmd, idx) => (
        <button
          key={cmd.id}
          onClick={handleSelect(cmd)}
          onMouseEnter={() => setHighlighted(idx)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            width: '100%',
            padding: '10px 14px',
            background: idx === highlighted ? '#2a2a5e' : 'transparent',
            border: 'none',
            borderBottom: idx < filtered.length - 1 ? '1px solid #2a2a4e' : 'none',
            color: '#eee',
            fontSize: 14,
            cursor: 'pointer',
            textAlign: 'left',
            minHeight: 44, // touch-friendly
            transition: 'background 0.15s',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 13 }}>{cmd.label}</span>
          <span style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{cmd.description}</span>
          <span style={{ fontSize: 11, color: '#4A90D9', marginTop: 2, fontFamily: 'monospace' }}>
            {cmd.template}
          </span>
        </button>
      ))}
      <div style={{ padding: '6px 14px', fontSize: 10, color: '#555', textAlign: 'center' }}>
        {HINT}
      </div>
    </div>
  );
}
