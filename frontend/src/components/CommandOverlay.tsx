import { useEffect, useRef, useState } from 'react';
import { COMMANDS, CommandDef } from '../data/commands';

interface Props {
  visible: boolean;
  filterText: string;
  contextTaskName: string | null;
  onSelect: (filledTemplate: string, cursorPos: number) => void;
  onClose: () => void;
}

const HINT = '↑↓ навигация · Tab/Enter выбрать · Esc закрыть';

/**
 * Fill template placeholders with context values.
 * Returns { text, cursorPos } where cursorPos is where to place caret.
 */
function fillTemplate(template: string, contextTaskName: string | null): { text: string; cursorPos: number } {
  let text = template;
  let cursorPos = 0;

  // {name} → context task name or removed
  const nameIdx = text.indexOf('{name}');
  if (nameIdx >= 0) {
    if (contextTaskName) {
      text = text.replace('{name}', contextTaskName);
      cursorPos = nameIdx + contextTaskName.length;
    } else {
      text = text.replace('{name}', '');
      cursorPos = nameIdx;
    }
  }

  // {days} → "3" default
  const daysIdx = text.indexOf('{days}');
  if (daysIdx >= 0) {
    text = text.replace('{days}', '3');
    if (cursorPos === 0 || cursorPos > daysIdx) cursorPos = daysIdx;
    // Select "3" for easy editing
    cursorPos = daysIdx;
  }

  // {person}, {date}, {dep} → removed, cursor at their position
  for (const ph of ['{person}', '{date}', '{dep}']) {
    const idx = text.indexOf(ph);
    if (idx >= 0) {
      text = text.replace(ph, '');
      if (cursorPos === 0 || cursorPos > idx) cursorPos = idx;
    }
  }

  // If no cursor was set, put at end
  if (cursorPos === 0) cursorPos = text.length;

  return { text, cursorPos };
}

export default function CommandOverlay({ visible, filterText, contextTaskName, onSelect, onClose }: Props) {
  const [highlighted, setHighlighted] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  const filtered = filterText.trim()
    ? COMMANDS.filter((c) =>
        c.label.toLowerCase().includes(filterText.toLowerCase()) ||
        c.keywords.some((k) => k.toLowerCase().includes(filterText.toLowerCase()))
      )
    : COMMANDS;

  useEffect(() => { setHighlighted(0); }, [filterText, visible]);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 100);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handler); };
  }, [visible, onClose]);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted((p) => Math.min(p + 1, filtered.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted((p) => Math.max(p - 1, 0)); }
      else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filtered[highlighted]) {
          const { text, cursorPos } = fillTemplate(filtered[highlighted].template, contextTaskName);
          onSelect(text, cursorPos);
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [visible, filtered, highlighted, contextTaskName, onSelect, onClose]);

  if (!visible || filtered.length === 0) return null;

  const handleClick = (cmd: CommandDef) => () => {
    const { text, cursorPos } = fillTemplate(cmd.template, contextTaskName);
    onSelect(text, cursorPos);
  };

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0, right: 0,
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
          onClick={handleClick(cmd)}
          onMouseEnter={() => setHighlighted(idx)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
            width: '100%', padding: '10px 14px',
            background: idx === highlighted ? '#2a2a5e' : 'transparent',
            border: 'none',
            borderBottom: idx < filtered.length - 1 ? '1px solid #2a2a4e' : 'none',
            color: '#eee', fontSize: 14, cursor: 'pointer', textAlign: 'left',
            minHeight: 44, transition: 'background 0.15s',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 13 }}>{cmd.label}</span>
          <span style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{cmd.description}</span>
        </button>
      ))}
      <div style={{ padding: '6px 14px', fontSize: 10, color: '#555', textAlign: 'center' }}>
        {HINT}
      </div>
    </div>
  );
}
