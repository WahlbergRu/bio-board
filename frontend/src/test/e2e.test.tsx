import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { useStore } from '../store';
import { Task } from '../types';

vi.mock('../api/client', () => ({
  client: {
    put: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    get: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('../api/tasks', () => ({
  fetchTasks: vi.fn().mockResolvedValue([]),
  seedPlan: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../api/excel', () => ({
  exportExcel: vi.fn(),
  exportIcal: vi.fn(),
}));

vi.mock('../api/chat', () => ({
  sendChat: vi.fn(),
}));

vi.mock('../hooks/useGantt', () => ({
  useGantt: () => ({ render: vi.fn() }),
}));

const mockTask: Task = {
  id: 't1', name: 'Тестовая задача', description: 'Описание',
  start_date: '2026-01-01', end_date: '2026-01-10',
  progress: 30, type: 'task', dependencies: [], assignee: 'Alice', project: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useStore.setState({
    tasks: [], chatMessages: [], selectedTask: null,
    viewMode: 'gantt', autoSave: true,
  });
});

describe('test_full_user_flow', () => {
  it('navigates gantt → kanban → gantt with empty state', async () => {
    render(<App />);
    expect(screen.getByText('AI Планировщик')).toBeInTheDocument();
    expect(screen.getByText(/Нет задач/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Канбан'));
    await waitFor(() => expect(useStore.getState().viewMode).toBe('kanban'));

    fireEvent.click(screen.getByText('Диаграмма Ганта'));
    await waitFor(() => expect(useStore.getState().viewMode).toBe('gantt'));
  });
});

describe('test_task_modal_flow', () => {
  it('opens modal, edits task, saves', async () => {
    const { fetchTasks } = await import('../api/tasks');
    (fetchTasks as ReturnType<typeof vi.fn>).mockResolvedValue([mockTask]);
    useStore.setState({ tasks: [mockTask], viewMode: 'kanban' });
    render(<App />);

    await waitFor(() => expect(screen.getByText('Тестовая задача')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Тестовая задача'));
    await waitFor(() => expect(screen.getByText('Детали задачи')).toBeInTheDocument());
    expect(screen.getByText('30')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Редактировать'));
    const nameInput = screen.getByDisplayValue('Тестовая задача');
    fireEvent.change(nameInput, { target: { value: 'Обновлённая задача' } });
    fireEvent.click(screen.getByText('Сохранить'));

    await waitFor(() => {
      expect(useStore.getState().tasks[0].name).toBe('Обновлённая задача');
    });
  });
});

describe('test_chat_flow', () => {
  it('sends message and shows user bubble', async () => {
    localStorage.setItem('gantt_auth', '1');
    useStore.setState({ tasks: [mockTask] });
    render(<App />);

    const input = screen.getByPlaceholderText(/Напишите команду/);
    fireEvent.change(input, { target: { value: 'Добавь задачу' } });
    expect(input).toHaveValue('Добавь задачу');

    const sendBtn = screen.getByText('→');
    fireEvent.click(sendBtn);

    await waitFor(() => {
      const msgs = useStore.getState().chatMessages;
      expect(msgs.length).toBeGreaterThan(0);
      expect(msgs[0].role).toBe('user');
      expect(msgs[0].content).toBe('Добавь задачу');
    });
  });
});

describe('test_excel_flow', () => {
  it('has file input and triggers export callbacks', async () => {
    const { exportExcel } = await import('../api/excel');
    const { exportIcal } = await import('../api/excel');
    render(<App />);

    expect(screen.getByText(/Загрузить/)).toBeInTheDocument();
    expect(screen.getByText(/Экспорт/)).toBeInTheDocument();

    // Open dropdown and click Excel export
    fireEvent.click(screen.getByText(/Экспорт/));
    const excelBtn = screen.getAllByText(/Excel/).find(el => el.tagName === 'BUTTON')!;
    fireEvent.click(excelBtn);
    expect(exportExcel).toHaveBeenCalled();

    // Open dropdown again and click iCal export
    fireEvent.click(screen.getByText(/Экспорт/));
    const icalBtn = screen.getAllByText(/iCal/).find(el => el.tagName === 'BUTTON')!;
    fireEvent.click(icalBtn);
    expect(exportIcal).toHaveBeenCalled();
  });
});

describe('test_view_switcher_integration', () => {
  it('updates store on view switch', async () => {
    render(<App />);
    expect(useStore.getState().viewMode).toBe('gantt');

    fireEvent.click(screen.getByText('Канбан'));
    await waitFor(() => expect(useStore.getState().viewMode).toBe('kanban'));
  });
});

describe('test_auto_save_toggle', () => {
  it('toggles auto-save on → off → on', async () => {
    render(<App />);
    expect(useStore.getState().autoSave).toBe(true);
    expect(screen.getByText('Автосохранение: ВКЛ')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Автосохранение: ВКЛ'));
    await waitFor(() => {
      expect(useStore.getState().autoSave).toBe(false);
      expect(screen.getByText('Автосохранение: ВЫКЛ')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Автосохранение: ВЫКЛ'));
    await waitFor(() => {
      expect(useStore.getState().autoSave).toBe(true);
      expect(screen.getByText('Автосохранение: ВКЛ')).toBeInTheDocument();
    });
  });
});
