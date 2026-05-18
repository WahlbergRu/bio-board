import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage } from '../types';
import { sendChat } from '../api/chat';
import { parseSSEStream, tryParseSuggestionsJSON } from '../api/sse';
import { ui } from '../i18n';
import { useStore } from '../store';
import CommandOverlay from './CommandOverlay';
import SuggestionsPanel from './SuggestionsPanel';

interface Props {
  messages: ChatMessage[];
  onMessagesChange: (msgs: ChatMessage[]) => void;
  isAuthenticated?: boolean;
  onComplete?: () => void;
}

interface SuggestionsState {
  note: string;
  error: string;
  commands: Array<{ label: string; command: string }>;
  executed: Set<string>;
}

const MAX_VISIBLE = 100;

function extractCreatedTaskName(msg: string): string | null {
  const m = msg.match(/(?:добавь|создай|create|new)\s+(?:задач[уа]?\s+)?(\S+)/i);
  return m ? m[1] : null;
}

function extractCreatedFromResponse(response: string): string | null {
  const m = response.match(/Создал задачу '([^']+)'/);
  return m ? m[1] : null;
}

function extractCopiedTaskName(response: string): string | null {
  const m = response.match(/Скопировал\s+'[^']+'\s*->\s*'([^']+)'/);
  return m ? m[1] : null;
}

export default function ChatPanel({ messages, onMessagesChange, isAuthenticated = false, onComplete }: Props) {
  const lastAddedTaskName = useStore(s => s.lastAddedTaskName);
  const setLastAddedTaskName = useStore(s => s.setLastAddedTaskName);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionsState | null>(null);
  const [showCommands, setShowCommands] = useState(false);
  const [commandFilter, setCommandFilter] = useState('');
  const [dots, setDots] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading) { setDots(''); return; }
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading, suggestions]);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    if (value.indexOf('/') === 0) {
      setCommandFilter(value.slice(1));
      setShowCommands(true);
      // Auto-close overlay after user picks a command and types more text
      // (space after /llm means they're typing the question, not selecting)
      const parts = value.split(/\s+/);
      if (parts.length >= 2 && value.includes('/llm')) {
        setShowCommands(false);
      }
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
    requestAnimationFrame(() => {
      inputRef.current?.setSelectionRange(cursorPos, cursorPos);
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

    const createdName = extractCreatedTaskName(msg);
    if (createdName) setLastAddedTaskName(createdName);

    setShowCommands(false);
    setCommandFilter('');
    const userMsg: ChatMessage = { role: 'user', content: msg, timestamp: new Date().toISOString() };
    const newHistory = overrideMsg ? messages : [...messages, userMsg];
    if (!overrideMsg) {
      onMessagesChange(newHistory);
      setInput('');
    }
    setLoading(true);
    if (!overrideMsg) setSuggestions(null);

    const assistantMsg: ChatMessage = { role: 'assistant', content: '', timestamp: new Date().toISOString() };
    const updated = [...newHistory, assistantMsg];
    onMessagesChange(updated);

    try {
      let fullText = '';
      for await (const chunk of sendChat(msg, newHistory.slice(-MAX_VISIBLE))) {
        fullText += chunk;
      }

      // Parse SSE
      const dataParts = parseSSEStream(fullText);
      const rawText = dataParts.join('') || fullText.replace(/^data: /gm, '').replace(/\[DONE\]/g, '').trim();

      // Try suggestions JSON
      const parsedSuggestions = tryParseSuggestionsJSON(rawText);
      if (parsedSuggestions) {
        setSuggestions({
          note: parsedSuggestions.note,
          error: parsedSuggestions.error,
          commands: parsedSuggestions.commands,
          executed: new Set(),
        });
        const newArr = updated.map((m, i) =>
          i === updated.length - 1 ? { ...m, content: parsedSuggestions.note || parsedSuggestions.error } : m
        );
        onMessagesChange(newArr);
      } else {
        if (!suggestions) setSuggestions(null);
        const newArr = updated.map((m, i) =>
          i === updated.length - 1 ? { ...m, content: rawText || fullText } : m
        );
        onMessagesChange(newArr);
      }

      // Update lastAddedTaskName from response
      const copiedName = extractCopiedTaskName(fullText);
      if (copiedName) {
        setLastAddedTaskName(copiedName);
      } else {
        const createdFromResponse = extractCreatedFromResponse(fullText);
        if (createdFromResponse) setLastAddedTaskName(createdFromResponse);
      }
    } catch {
      setSuggestions(null);
      const errArr = updated.map((m, i) => i === updated.length - 1 ? { ...m, content: '⚠️ ' + ui.llmError } : m);
      onMessagesChange(errArr);
    } finally {
      setLoading(false);
      onComplete?.();
    }
  }, [input, loading, isAuthenticated, messages, onMessagesChange, onComplete, setLastAddedTaskName, suggestions]);

  const handleSuggestionClick = useCallback((command: string) => () => {
    setSuggestions(prev => {
      if (!prev) return null;
      const next = new Set(prev.executed);
      next.add(command);
      return { ...prev, executed: next };
    });
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
        {visible.map((m, i) => {
          if (m.role === 'assistant' && !m.content) return null;
          return (
            <div key={i} style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%', padding: '8px 12px', borderRadius: 12,
              background: m.role === 'user' ? '#4A90D9' : '#2a2a4e',
              color: '#eee', fontSize: 13, lineHeight: 1.4,
            }}>
              <div dangerouslySetInnerHTML={{ __html: m.content.replace(/\n/g, '<br/>') }} />
            </div>
          );
        })}
        {suggestions && (
          <SuggestionsPanel
            note={suggestions.note}
            error={suggestions.error}
            commands={suggestions.commands}
            executed={suggestions.executed}
            onExecute={handleSuggestionClick}
          />
        )}
        {loading && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
            background: '#1a1a3a', borderRadius: 12, border: '1px solid #333',
            maxWidth: '85%', alignSelf: 'flex-start',
          }}>
            <div style={{ position: 'relative', width: 18, height: 18 }}>
              <div style={{
                position: 'absolute', inset: 0,
                border: '2px solid transparent', borderTop: '2px solid #4A90D9',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
              }} />
            </div>
            <span style={{ color: '#ccc', fontSize: 13 }}>Обрабатываю{dots}</span>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div style={{ padding: '8px 12px', borderTop: '1px solid #333', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {!isAuthenticated && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
            background: '#2a1a1a', border: '1px solid #5a3030', borderRadius: 6,
            fontSize: 11, color: '#ff8888',
          }}>
            <span>🔒</span>
            <span>Войдите для использования AI-чата</span>
          </div>
        )}
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
                if (!showCommands) handleSend();
              }
            }}
            placeholder={showCommands ? ui.chatPlaceholderCommand : ui.chatPlaceholder}
            disabled={loading || !isAuthenticated}
            className="form-input"
            style={{ flex: 1 }}
          />
          <button onClick={() => handleSend()} disabled={loading || !input.trim() || !isAuthenticated} className="btn btn-primary" style={{ padding: '6px 14px' }}>
            {loading ? ui.sending : '→'}
          </button>
        </div>
      </div>
    </div>
  );
}
