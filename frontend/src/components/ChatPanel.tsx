import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { sendChat } from '../api/chat';
import type { ChatMessage } from '../types';

export default function ChatPanel() {
  const { chatMessages, addMessage } = useStore();
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [chatMessages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
    addMessage(userMsg);
    setStreaming(true);

    const assistantMsg: ChatMessage = { role: 'assistant', content: '', timestamp: new Date().toISOString() };
    addMessage(assistantMsg);

    try {
      const history = chatMessages.filter((m) => m.role !== 'system');
      const gen = sendChat(text, history);
      let accumulated = '';
      for await (const chunk of gen) {
        accumulated += chunk;
        const content = accumulated;
        useStore.setState((s) => ({
          chatMessages: s.chatMessages.map((m, i) =>
            i === s.chatMessages.length - 1 ? { ...m, content } : m
          ),
        }));
      }
    } catch (err) {
      const content = `Error: ${err instanceof Error ? err.message : 'Unknown'}`;
      useStore.setState((s) => ({
        chatMessages: s.chatMessages.map((m, i) =>
          i === s.chatMessages.length - 1 ? { ...m, content } : m
        ),
      }));
    } finally {
      setStreaming(false);
    }
  };

  const bubble = (msg: ChatMessage): React.CSSProperties => ({
    maxWidth: '85%', padding: '8px 12px', borderRadius: 12, fontSize: 13,
    lineHeight: 1.5, wordBreak: 'break-word',
    ...(msg.role === 'user'
      ? { background: '#4A90D9', color: '#fff', alignSelf: 'flex-end', borderBottomRightRadius: 4 }
      : { background: '#2a2a44', color: '#ddd', alignSelf: 'flex-start', borderBottomLeftRadius: 4 }),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#16162a', borderLeft: '1px solid #333' }}>
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {chatMessages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={bubble(msg)}>{msg.content}{streaming && i === chatMessages.length - 1 && <span className="cursor">▌</span>}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid #333' }}>
        <input
          value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask AI to modify plan..."
          style={{
            flex: 1, padding: '8px 12px', background: '#2a2a44', border: '1px solid #444',
            borderRadius: 8, color: '#eee', fontSize: 13, outline: 'none',
          }}
        />
        <button onClick={handleSend} disabled={streaming} style={{
          padding: '8px 16px', background: streaming ? '#333' : '#4A90D9', color: '#fff',
          border: 'none', borderRadius: 8, cursor: streaming ? 'not-allowed' : 'pointer', fontSize: 13,
        }}>
          {streaming ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
