import type { ChatMessage } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export async function* sendChat(
  message: string,
  history: ChatMessage[],
): AsyncGenerator<string, void, unknown> {
  const res = await fetch(`${API_URL}/chat/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(localStorage.getItem('gantt_token')
        ? { Authorization: `Bearer ${localStorage.getItem('gantt_token')}` }
        : {}),
    },
    body: JSON.stringify({ message, history }),
  });

  if (!res.ok) throw new Error(`Chat error: ${res.status}`);
  if (!res.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value, { stream: true });
  }
}
