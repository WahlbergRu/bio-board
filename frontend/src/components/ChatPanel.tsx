import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage } from '../types';
import { sendChat } from '../api/chat';
import { ui } from '../i18n';

interface Props {
  messages: ChatMessage[];
  onMessagesChange: (msgs: ChatMessage[]) => void;
  isAuthenticated: boolean;
  onComplete?: () => void;
}

interface Suggestion {
  label: string;
  command: string;
}

interface SuggestionsState {
  note: string;
  commands: Suggestion[];
}

const MAX_VISIBLE = 100;

export default function ChatPanel({ messages, onMessagesChange, isAuthenticated, onComplete }: Props) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionsState | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading, suggestions]);

  const handleSend = useCallback(async (overrideMsg?: string) => {
    const msg = overrideMsg ?? input.trim();
    if (!msg || loading || !isAuthenticated) return;
    const userMsg: ChatMessage = { role: 'user', content: msg, timestamp: new Date().toISOString() };
    const newHistory = overrideMsg ? messages : [...messages, userMsg];
    if (!overrideMsg) {
      onMessagesChange(newHistory);
      setInput('');
    }
    setLoading(true);
    setSuggestions(null);

    const assistantMsg: ChatMessage = { role: 'assistant', content: '', timestamp: new Date().toISOString() };
    const updated = [...newHistory, assistantMsg];
    onMessagesChange(updated);

    try {
      let fullText = '';
      let parsedSuggestions: SuggestionsState | null = null;
      
      for await (const chunk of sendChat(msg, newHistory.slice(-MAX_VISIBLE))) {
        fullText += chunk;
      }

      // Parse after full response received
      try {
        if (fullText.startsWith('{')) {
          const data = JSON.parse(fullText);
          if (data.type === 'suggestions') {
            parsedSuggestions = {
              note: data.note,
              commands: data.commands,
            };
            // Update message text with note
            const newArr = updated.map((m, i) =>
              i === updated.length - 1 ? { ...m, content: parsedSuggestions!.note || 'Выберите команду:' } : m
            );
            onMessagesChange(newArr);
          } else {
            // Regular JSON response, show as text
            const newArr = updated.map((m, i) =>
              i === updated.length - 1 ? { ...m, content: fullText } : m
            );
            onMessagesChange(newArr);
          }
        } else {
          // Plain text response
          const newArr = updated.map((m, i) =>
            i === updated.length - 1 ? { ...m, content: fullText } : m
          );
          onMessagesChange(newArr);
        }
      } catch {
        // Not JSON, show as text
        const newArr = updated.map((m, i) =>
          i === updated.length - 1 ? { ...m, content: fullText } : m
        );
        onMessagesChange(newArr);
      }

      if (parsedSuggestions) {
        setSuggestions(parsedSuggestions);
      }
    } catch {
      const errArr = updated.map((m, i) => i === updated.length - 1 ? { ...m, content: '⚠️ ' + ui.llmError } : m);
      onMessagesChange(errArr);
    } finally {
      setLoading(false);
      onComplete?.();
    }
  }, [input, loading, isAuthenticated, messages, onMessagesChange, onComplete]);

  const handleSuggestionClick = useCallback((command: string) => () => {
    setSuggestions(null);
    handleSend(command);
  }, [handleSend]);

  const visible = messages.slice(-MAX_VISIBLE);
  const offset = Math.max(0, messages.length - MAX_VISIBLE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '6px 12px', fontSize: 12, color: '#666', borderBottom: '1px solid #333' }}>
        {offset > 0 ? `${ui.lastMessages} (${offset} скрыто)` : ui.chatHistory}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visible.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%', padding: '8px 12px', borderRadius: 12,
            background: m.role === 'user' ? '#4A90D9' : '#2a2a4e',
            color: '#eee', fontSize: 13, lineHeight: 1.4,
          }}>
            <div dangerouslySetInnerHTML={{ __html: m.content.replace(/\n/g, '<br/>') }} />
          </div>
        ))}
        {suggestions && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 12px',
            background: '#1a1a3a', borderRadius: 12, border: '1px solid #444',
            maxWidth: '85%', alignSelf: 'flex-start',
          }}>
            {suggestions.commands.map((s, idx) => (
              <button
                key={idx}
                onClick={handleSuggestionClick(s.command)}
                style={{
                  padding: '8px 16px', background: '#4A90D9', border: 'none',
                  borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer',
                  textAlign: 'left', transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#357ABD')}
                onMouseLeave={e => (e.currentTarget.style.background = '#4A90D9')}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
        {loading && <div style={{ color: '#666', fontSize: 12, padding: '4px 12px' }}>▋</div>}
        <div ref={endRef} />
      </div>
      <div style={{ padding: '8px 12px', borderTop: '1px solid #333', display: 'flex', gap: 6, alignItems: 'center' }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
          placeholder={ui.chatPlaceholder} disabled={loading || !isAuthenticated}
          style={{ flex: 1, padding: '6px 10px', background: '#2a2a4e', border: '1px solid #444', borderRadius: 6, color: '#eee', fontSize: 13 }}
        />
        <button onClick={() => handleSend()} disabled={loading || !input.trim() || !isAuthenticated} className="btn btn-primary" style={{ padding: '6px 14px' }}>
          {loading ? ui.sending : '→'}
        </button>
      </div>
    </div>
  );
}
