import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ViewSwitcher from '../components/ViewSwitcher';
import Header from '../components/Header';
import TaskModal from '../components/TaskModal';
import Notification from '../components/Notification';
import ExcelHandler from '../components/ExcelHandler';
import { Task } from '../types';

describe('ViewSwitcher', () => {
  it('renders both view buttons', () => {
    render(<ViewSwitcher currentMode="gantt" onChange={() => {}} />);
    expect(screen.getByText('Диаграмма Ганта')).toBeInTheDocument();
    expect(screen.getByText('Канбан')).toBeInTheDocument();
  });

  it('highlights active mode', () => {
    render(<ViewSwitcher currentMode="kanban" onChange={() => {}} />);
    const kanbanBtn = screen.getByText('Канбан');
    expect(kanbanBtn).toHaveStyle({ background: '#4A90D9' });
  });

  it('calls onChange on click', () => {
    const onChange = vi.fn();
    render(<ViewSwitcher currentMode="gantt" onChange={onChange} />);
    fireEvent.click(screen.getByText('Канбан'));
    expect(onChange).toHaveBeenCalledWith('kanban');
  });
});

describe('Notification', () => {
  it('renders message', () => {
    render(<Notification message="Test notification" />);
    expect(screen.getByText('Test notification')).toBeInTheDocument();
  });
});

describe('TaskModal', () => {
  const task: Task = {
    id: '1', name: 'Test Task', description: 'A test',
    start_date: '2026-01-01', end_date: '2026-01-05',
    progress: 50, type: 'task', dependencies: [],
    assignee: 'Alice', project: '',
  };

  it('does not render when closed', () => {
    render(<TaskModal task={task} isOpen={false} onClose={() => {}} onSave={() => {}} />);
    expect(screen.queryByText('Детали задачи')).not.toBeInTheDocument();
  });

  it('renders when open', () => {
    render(<TaskModal task={task} isOpen={true} onClose={() => {}} onSave={() => {}} />);
    expect(screen.getByText('Детали задачи')).toBeInTheDocument();
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('shows edit button', () => {
    render(<TaskModal task={task} isOpen={true} onClose={() => {}} onSave={() => {}} />);
    expect(screen.getByText('Редактировать')).toBeInTheDocument();
  });

  it('closes on close button click', () => {
    const onClose = vi.fn();
    render(<TaskModal task={task} isOpen={true} onClose={onClose} onSave={() => {}} />);
    fireEvent.click(screen.getByText('Закрыть'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows task details in view mode', () => {
    render(<TaskModal task={task} isOpen={true} onClose={() => {}} onSave={() => {}} />);
    expect(screen.getByText('Задача')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });
});

describe('ExcelHandler', () => {
  it('renders upload and export buttons', () => {
    render(<ExcelHandler onUpload={() => {}} onExport={() => {}} onExportIcal={() => {}} />);
    expect(screen.getByText('Загрузить Excel')).toBeInTheDocument();
    expect(screen.getByText('Экспорт Excel')).toBeInTheDocument();
  });

  it('renders iCal export button', () => {
    render(<ExcelHandler onUpload={() => {}} onExport={() => {}} onExportIcal={() => {}} />);
    expect(screen.getByText('Экспорт iCal')).toBeInTheDocument();
  });
});

describe('Header', () => {
  const defaultProps = {
    viewMode: 'gantt' as const,
    zoomLevel: 'week' as const,
    onViewChange: () => {},
    onZoomChange: () => {},
    onSeed: () => {},
    onUpload: () => {},
    onExport: () => {},
    onExportIcal: () => {},
    onSave: () => {},
    onToggleAutoSave: () => {},
    autoSave: true,
    onLogin: () => {},
    onLogout: () => {},
    isAuthenticated: true,
  };

  it('renders title', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('AI Планировщик')).toBeInTheDocument();
  });

  it('renders save button', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('💾 Сохранить')).toBeInTheDocument();
  });

  it('shows login when not authenticated', () => {
    render(<Header {...defaultProps} isAuthenticated={false} />);
    expect(screen.getByText('Войти')).toBeInTheDocument();
  });

  it('shows logout when authenticated', () => {
    render(<Header {...defaultProps} isAuthenticated={true} />);
    expect(screen.getByText('Выйти')).toBeInTheDocument();
  });

  it('renders zoom selector with options', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('День')).toBeInTheDocument();
    expect(screen.getByText('Неделя')).toBeInTheDocument();
    expect(screen.getByText('Месяц')).toBeInTheDocument();
  });
});
