interface Suggestion {
  label: string;
  command: string;
}

interface Props {
  note: string;
  error: string;
  commands: Suggestion[];
  executed: Set<string>;
  onExecute: (command: string) => void;
}

export default function SuggestionsPanel({ note, error, commands, executed, onExecute }: Props) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 12px',
      background: '#1a1a3a', borderRadius: 12, border: '1px solid #444',
      maxWidth: '85%', alignSelf: 'flex-start',
    }}>
      {error && (
        <div style={{
          padding: '8px 12px', background: '#2d1a1a', borderRadius: 8,
          border: '1px solid #5a2a2a', color: '#e88', fontSize: 12, lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}
      {note && (
        <div style={{ padding: '4px 0', color: '#aaa', fontSize: 12, lineHeight: 1.4 }}>
          {note}
        </div>
      )}
      {commands.map((s, idx) => {
        const isExecuted = executed.has(s.command);
        return (
          <button
            key={idx}
            onClick={isExecuted ? undefined : () => onExecute(s.command)}
            disabled={isExecuted}
            style={{
              padding: '8px 16px',
              background: isExecuted ? '#2d4a2d' : '#4A90D9',
              border: 'none',
              borderRadius: 8,
              color: isExecuted ? '#8c8' : '#fff',
              fontSize: 13,
              cursor: isExecuted ? 'default' : 'pointer',
              textAlign: 'left',
              transition: 'background 0.2s',
              opacity: isExecuted ? 0.7 : 1,
            }}
            onMouseEnter={e => { if (!isExecuted) e.currentTarget.style.background = '#357ABD'; }}
            onMouseLeave={e => { if (!isExecuted) e.currentTarget.style.background = '#4A90D9'; }}
          >
            {isExecuted ? '✅ ' : ''}{s.label}
          </button>
        );
      })}
    </div>
  );
}
