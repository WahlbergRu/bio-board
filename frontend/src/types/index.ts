export interface Task {
  id: string;
  name: string;
  description: string;
  start_date: string;  // YYYY-MM-DD
  end_date: string;    // YYYY-MM-DD
  progress: number;    // 0-100
  type: 'task' | 'milestone' | 'project';
  dependencies: string[];
  assignee: string;
  project: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface TaskFormData {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  progress: number;
  type: 'task' | 'milestone' | 'project';
  assignee: string;
  /** Dependencies as comma-separated string for form input: "1 — TaskA, 2 — TaskB" */
  dependencies: string;
}

/** Parse dependency string "1 — TaskA, 2 — TaskB" into IDs */
export function parseDependencyIds(raw: string, allTasks: Task[]): string[] {
  return raw.split(',').map(s => s.trim()).filter(Boolean).map(part => {
    const idMatch = part.match(/^(\d+)\s*[—-]/);
    if (idMatch) return idMatch[1];
    if (/^\d+$/.test(part)) return part;
    const found = allTasks.find(t => t.name.toLowerCase() === part.toLowerCase());
    return found ? found.id : part;
  });
}
