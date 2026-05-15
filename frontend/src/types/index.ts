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
  dependencies: string;  // comma-separated for form input
}
