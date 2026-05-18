/**
 * Parse SSE (Server-Sent Events) stream text into individual messages.
 * Handles `data: ` prefix and `[DONE]` terminator.
 */
export function parseSSEStream(rawText: string): string[] {
  const messages: string[] = [];
  const lines = rawText.split('\n');
  let currentMessage = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('data: ')) {
      const data = trimmed.slice(6);
      if (data === '[DONE]') {
        if (currentMessage) messages.push(currentMessage);
        currentMessage = '';
      } else {
        currentMessage += data;
      }
    } else if (trimmed === '') {
      if (currentMessage) {
        messages.push(currentMessage);
        currentMessage = '';
      }
    } else {
      // Non-SSE line — treat as raw text
      if (!currentMessage) {
        currentMessage = trimmed;
      }
    }
  }

  if (currentMessage) messages.push(currentMessage);
  return messages.length ? messages : [rawText];
}

/**
 * Try to parse a JSON suggestions payload from LLM response.
 * Strips markdown code fences if present.
 */
export function tryParseSuggestionsJSON(rawText: string): {
  type: string;
  note: string;
  error: string;
  commands: Array<{ label: string; command: string }>;
} | null {
  let cleaned = rawText.trim();

  // Strip markdown code fences
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.split('```')[1];
    if (cleaned.startsWith('json')) cleaned = cleaned.slice(4);
    cleaned = cleaned.replace(/`+$/, '').trim();
  }

  if (!cleaned.startsWith('{')) return null;

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.type === 'suggestions') {
      return {
        type: parsed.type,
        note: parsed.note || '',
        error: parsed.error || '',
        commands: parsed.commands || [],
      };
    }
    // Generic JSON with suggestions array
    if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
      return {
        type: 'suggestions',
        note: parsed.note || '',
        error: '',
        commands: parsed.suggestions,
      };
    }
  } catch {
    // Not valid JSON
  }

  return null;
}

/**
 * Sanitize HTML content to prevent XSS from LLM responses.
 */
export function sanitizeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
