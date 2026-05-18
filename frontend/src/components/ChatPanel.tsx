import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage } from '../types';
import { sendChat } from '../api/chat';
import { ui } from '../i18n';
import { useStore } from '../store';
import CommandOverlay from './CommandOverlay';

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

// Extract task name from "добавь задачу X" or "создай X"
function extractCreatedTaskName(msg: string): string | null {
  const m = msg.match(/(?:добавь|создай|create|new)\s+(?:задач[уа]?\s+)?(\S+)/i);
  return m ? m[1] : null;
}

// Extract created task name from server response: "Создал задачу 'X'"
function extractCreatedFromResponse(response: string): string | null {
  const m = response.match(/Создал задачу '([^']+)'/);
  return m ? m[1] : null;
}

// Extract copied task name from server response: "Скопировал 'X' -> 'Y'"
function extractCopiedTaskName(response: string): string | null {
  const m = response.match(/Скопировал\s+'[^']+'\s*->\s*'([^']+)'/);
  return m ? m[1] : null;
}

export default function ChatPanel({ messages, onMessagesChange, isAuthenticated, onComplete }: Props) {
  const lastAddedTaskName = useStore(s => s.lastAddedTaskName);
  const setLastAddedTaskName = useStore(s => s.setLastAddedTaskName);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionsState | null>(null);
  const [showCommands, setShowCommands] = useState(false);
  const [commandFilter, setCommandFilter] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading, suggestions]);

  // Detect "/" trigger
  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    const slashIdx = value.indexOf('/');
    if (slashIdx === 0) {
      setCommandFilter(value.slice(1));
      setShowCommands(true);
    } else {
      setShowCommands(false);
      setCommandFilter('');
    }
  }, []);

  const handleCommandSelect = useCallback((text: string, cursorPos: number) => {
    setInput(text);
    setShowCommands(false);
    setCommandFilter('');
    inputRef.current?.focus();
    // Position cursor at the placeholder location
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) {
        el.setSelectionRange(cursorPos, cursorPos);
      }
    });
  }, []);

  const handleCommandClose = useCallback(() => {
    setShowCommands(false);
    setCommandFilter('');
  }, []);

  const handleCommandsButtonClick = useCallback(() => {
    if (showCommands) {
      handleCommandClose();
    } else {
      setInput('/');
      setCommandFilter('');
      setShowCommands(true);
      inputRef.current?.focus();
    }
  }, [showCommands, handleCommandClose]);

  const handleSend = useCallback(async (overrideMsg?: string) => {
    const msg = overrideMsg ?? input.trim();
    if (!msg || loading || !isAuthenticated) return;

    // Track last added task name
    const createdName = extractCreatedTaskName(msg);
    if (createdName) {
      setLastAddedTaskName(createdName);
    }

    setShowCommands(false);
    setCommandFilter('');
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

      // Clean SSE format: remove "data: " prefixes and "[DONE]" markers
      const cleanText = fullText
        .split('\n')
        .map(line => {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) return trimmed.slice(6);
          if (trimmed === 'data:') return '';
          if (trimmed === '[DONE]') return '';
          return trimmed;
        })
        .filter(Boolean)
        .join('');

      try {
        if (cleanText.startsWith('{')) {
          const data = JSON.parse(cleanText);
          if (data.type === 'suggestions') {
            parsedSuggestions = {
              note: data.note,
              commands: data.commands,
            };
            const newArr = updated.map((m, i) =>
              i === updated.length - 1 ? { ...m, content: parsedSuggestions!.note || 'Выберите команду:' } : m
            );
            onMessagesChange(newArr);
          } else {
            const newArr = updated.map((m, i) =>
              i === updated.length - 1 ? { ...m, content: cleanText } : m
            );
            onMessagesChange(newArr);
          }
        } else {
          const newArr = updated.map((m, i) =>
            i === updated.length - 1 ? { ...m, content: cleanText } : m
          );
          onMessagesChange(newArr);
        }
      } catch {
        const newArr = updated.map((m, i) =>
          i === updated.length - 1 ? { ...m, content: cleanText || fullText } : m
        );
        onMessagesChange(newArr);
      }

      if (parsedSuggestions) {
        setSuggestions(parsedSuggestions);
      }

      // Parse server response for copy/create to update lastAddedTaskName
      const copiedName = extractCopiedTaskName(fullText);
      if (copiedName) {
        setLastAddedTaskName(copiedName);
      } else {
        const createdFromResponse = extractCreatedFromResponse(fullText);
        if (createdFromResponse) {
          setLastAddedTaskName(createdFromResponse);
        }
      }
    } catch {
      const errArr = updated.map((m, i) => i === updated.length - 1 ? { ...m, content: '⚠️ ' + ui.llmError } : m);
      onMessagesChange(errArr);
    } finally {
      setLoading(false);
      onComplete?.();
    }
  }, [input, loading, isAuthenticated, messages, onMessagesChange, onComplete, setLastAddedTaskName]);

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
      <div style={{ padding: '8px 12px', borderTop: '1px solid #333', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button
            onClick={handleCommandsButtonClick}
            disabled={loading || !isAuthenticated}
            style={{
              padding: '4px 12px', background: showCommands ? '#4A90D9' : '#2a2a4e',
              border: '1px solid #444', borderRadius: 6, color: showCommands ? '#fff' : '#aaa',
              fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {ui.commandsButton}
          </button>
        </div>
        <div style={{ position: 'relative', display: 'flex', gap: 6, alignItems: 'center' }}>
          <CommandOverlay
            visible={showCommands}
            filterText={commandFilter}
            contextTaskName={lastAddedTaskName}
            onSelect={handleCommandSelect}
            onClose={handleCommandClose}
          />
          <input
            ref={inputRef}
            value={input}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                // If overlay is open, let CommandOverlay handle Enter
                if (!showCommands) {
                  handleSend();
                }
              }
            }}
            placeholder={showCommands ? ui.chatPlaceholderCommand : ui.chatPlaceholder}
            disabled={loading || !isAuthenticated}
            style={{ flex: 1, padding: '6px 10px', background: '#2a2a4e', border: '1px solid #444', borderRadius: 6, color: '#eee', fontSize: 13 }}
          />
          <button onClick={() => handleSend()} disabled={loading || !input.trim() || !isAuthenticated} className="btn btn-primary" style={{ padding: '6px 14px' }}>
            {loading ? ui.sending : '→'}
          </button>
        </div>
      </div>
    </div>
  );
}
