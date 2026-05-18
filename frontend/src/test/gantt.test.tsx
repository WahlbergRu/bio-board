import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import GanttView from '../components/GanttView';
import { Task } from '../types';

// ============================================================
// D3 Mock — via vi.hoisted
// ============================================================

const { mockD3, mockObserver } = vi.hoisted(() => {
  const sel = {
    selectAll: vi.fn(() => sel), remove: vi.fn(() => sel), append: vi.fn(() => sel),
    attr: vi.fn(function () { return sel; }), style: vi.fn(() => sel), text: vi.fn(() => sel),
    call: vi.fn(function () { return sel; }), on: vi.fn(() => sel), data: vi.fn(() => sel), 
    join: vi.fn(() => sel), select: vi.fn(() => sel), filter: vi.fn(() => sel), 
    each: vi.fn(() => sel), node: vi.fn(() => ({ getBoundingClientRect: () => ({ width: 800, height: 600 }) })),
    datum: vi.fn(() => sel), insert: vi.fn(() => sel), transition: vi.fn(() => sel), 
    interrupt: vi.fn(() => sel), empty: vi.fn(() => false), lower: vi.fn(() => sel),
  };
  const dragObj = { on: vi.fn(function () { return dragObj; }) };
  const dates = [new Date('2026-01-01'), new Date('2026-01-05'), new Date('2026-01-10')];
  const xFn: any = (d: Date | number) => d instanceof Date ? d.getTime() / 1000 : d * 10;
  xFn.invert = (v: number) => new Date(v * 1000);
  xFn.ticks = (_n?: number) => dates;
  const yFn: any = (_d: any) => 10;
  yFn.bandwidth = () => 20;
  yFn.step = () => 30;
  const obs = { observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() };

  // Zoom mock with proper method chaining
  const zoomOnMock = vi.fn(() => {});
  const zoomFilterMock = vi.fn(() => ({ on: zoomOnMock }));
  const zoomScaleExtentMock = vi.fn(() => ({ filter: zoomFilterMock, on: zoomOnMock }));
  const zoomMock = vi.fn(() => ({ scaleExtent: zoomScaleExtentMock }));

  return {
    mockD3: {
      select: vi.fn(() => sel), drag: vi.fn(() => dragObj),
      zoom: zoomMock,
      zoomIdentity: { translate: vi.fn(() => ({ scale: vi.fn(() => ({})) })), scale: vi.fn(() => ({})) },
      scaleTime: vi.fn(() => ({ domain: vi.fn(() => ({ range: vi.fn(() => xFn) })) })),
      scaleBand: vi.fn(() => ({ domain: vi.fn(() => ({ range: vi.fn(() => ({ padding: vi.fn(() => yFn) })) })) })),
      extent: vi.fn((arr: number[]) => [Math.min(...arr), Math.max(...arr)]),
      timeDay: { offset: vi.fn((d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; }) },
      timeWeek: { offset: vi.fn((d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n * 7); return r; }) },
      timeMonth: { offset: vi.fn((d: Date, n: number) => { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; }) },
      timeFormat: vi.fn(() => (_d: Date) => 'Jan 01'),
      axisTop: vi.fn(() => ({ ticks: vi.fn(() => ({ tickFormat: vi.fn(() => {}) })) })),
      color: vi.fn(() => ({ darker: vi.fn(() => ({ toString: () => '#333' })) })),
    },
    mockObserver: obs,
  };
});

vi.mock('d3', () => mockD3);

// ============================================================
// ResizeObserver — must be a constructor (class)
// ============================================================

let _resizeCb: Function | null = null;
let _observeSpy: any, _disconnectSpy: any;
beforeAll(() => {
  _observeSpy = vi.fn();
  _disconnectSpy = vi.fn();
  (globalThis as any).ResizeObserver = class ResizeObserver {
    observe = _observeSpy;
    disconnect = _disconnectSpy;
    unobserve = vi.fn();
    constructor(cb: Function) { _resizeCb = cb; }
  };
});

// ============================================================
// Test data
// ============================================================
const mockTasks: Task[] = [
  { id: 't1', name: 'Task Alpha', description: 'First', start_date: '2026-01-01', end_date: '2026-01-05', progress: 50, type: 'task', dependencies: [], assignee: 'Alice', project: 'P1' },
  { id: 'm1', name: 'Milestone', description: 'MS', start_date: '2026-01-10', end_date: '2026-01-10', progress: 0, type: 'milestone', dependencies: [], assignee: 'Bob', project: 'P1' },
];

// ============================================================
// Tests
// ============================================================
describe('GanttView', () => {
  const defaultProps = { tasks: mockTasks, onTaskClick: vi.fn(), onTaskUpdate: vi.fn(), onContextMenu: vi.fn(), zoom: 'week' as const };
  beforeEach(() => { vi.clearAllMocks(); mockObserver.observe.mockClear(); mockObserver.disconnect.mockClear(); });
  afterEach(() => { cleanup(); });

  it('renders container with correct styles', () => {
    const { container } = render(<GanttView {...defaultProps} />);
    const div = container.firstChild as HTMLElement;
    expect(div).toHaveStyle({ width: '100%', height: '100%', position: 'relative' });
  });

  it('renders SVG inside container', () => {
    const { container } = render(<GanttView {...defaultProps} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('calls d3.select to render', () => {
    render(<GanttView {...defaultProps} />);
    expect(mockD3.select).toHaveBeenCalled();
  });

  it('handles empty tasks array', () => {
    render(<GanttView {...defaultProps} tasks={[]} />);
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('renders with all zoom levels', () => {
    for (const z of ['day', 'week', 'month', 'quarter'] as const) {
      vi.clearAllMocks();
      const { unmount } = render(<GanttView {...defaultProps} zoom={z} />);
      expect(mockD3.select).toHaveBeenCalled();
      unmount();
    }
  });

  it('calls d3.drag for move/resize', () => {
    render(<GanttView {...defaultProps} />);
    expect(mockD3.drag).toHaveBeenCalled();
  });

  it('calls d3.zoom for zoom support', () => {
    render(<GanttView {...defaultProps} />);
    expect(mockD3.zoom).toHaveBeenCalled();
  });

  it('calls d3.scaleTime for x axis', () => {
    render(<GanttView {...defaultProps} />);
    expect(mockD3.scaleTime).toHaveBeenCalled();
  });

  it('calls d3.scaleBand for y axis', () => {
    render(<GanttView {...defaultProps} />);
    expect(mockD3.scaleBand).toHaveBeenCalled();
  });

  it('calls d3.extent for date range', () => {
    render(<GanttView {...defaultProps} />);
    expect(mockD3.extent).toHaveBeenCalled();
  });

  it('calls d3.timeDay.offset for domain calculation', () => {
    render(<GanttView {...defaultProps} />);
    expect(mockD3.timeDay.offset).toHaveBeenCalled();
  });
});

describe('GanttView — ResizeObserver', () => {
  const defaultProps = { tasks: mockTasks, onTaskClick: vi.fn(), onTaskUpdate: vi.fn(), onContextMenu: vi.fn(), zoom: 'week' as const };
  beforeEach(() => { vi.clearAllMocks(); _observeSpy.mockClear(); _disconnectSpy.mockClear(); _resizeCb = null; });
  afterEach(() => { cleanup(); });

  it('creates ResizeObserver on mount', () => {
    render(<GanttView {...defaultProps} />);
    expect(_resizeCb).not.toBeNull();
  });

  it('observes container element', () => {
    render(<GanttView {...defaultProps} />);
    expect(_observeSpy).toHaveBeenCalled();
  });

  it('disconnects on unmount', () => {
    const { unmount } = render(<GanttView {...defaultProps} />);
    unmount();
    expect(_disconnectSpy).toHaveBeenCalled();
  });

  it('triggers re-render on resize', () => {
    render(<GanttView {...defaultProps} />);
    const countBefore = mockD3.select.mock.calls.length;
    if (_resizeCb) _resizeCb();
    expect(mockD3.select.mock.calls.length).toBeGreaterThan(countBefore);
  });
});

describe('GanttView — Task Types', () => {
  const baseProps = { onTaskClick: vi.fn(), onTaskUpdate: vi.fn(), onContextMenu: vi.fn(), zoom: 'week' as const };
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); });

  it('renders milestone', () => {
    const tasks: Task[] = [{ id: 'm1', name: 'M', description: '', start_date: '2026-02-01', end_date: '2026-02-01', progress: 0, type: 'milestone', dependencies: [], assignee: 'A', project: 'P' }];
    render(<GanttView tasks={tasks} {...baseProps} zoom="month" />);
    expect(mockD3.select).toHaveBeenCalled();
  });

  it('renders project', () => {
    const tasks: Task[] = [{ id: 'p1', name: 'Proj', description: '', start_date: '2026-01-01', end_date: '2026-03-01', progress: 30, type: 'project', dependencies: [], assignee: 'T', project: 'P' }];
    render(<GanttView tasks={tasks} {...baseProps} zoom="quarter" />);
    expect(mockD3.select).toHaveBeenCalled();
  });

  it('renders tasks with dependencies', () => {
    const tasks: Task[] = [
      { id: 'a', name: 'A', description: '', start_date: '2026-01-01', end_date: '2026-01-05', progress: 100, type: 'task', dependencies: [], assignee: 'X', project: 'P' },
      { id: 'b', name: 'B', description: '', start_date: '2026-01-06', end_date: '2026-01-10', progress: 0, type: 'task', dependencies: ['a'], assignee: 'Y', project: 'P' },
    ];
    render(<GanttView tasks={tasks} {...baseProps} />);
    expect(mockD3.select).toHaveBeenCalled();
  });
});

describe('GanttView — Progress & Edge Cases', () => {
  const baseProps = { onTaskClick: vi.fn(), onTaskUpdate: vi.fn(), onContextMenu: vi.fn(), zoom: 'week' as const };
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); });

  it('handles 0% progress', () => {
    const tasks: Task[] = [{ id: 't1', name: 'T', description: '', start_date: '2026-01-01', end_date: '2026-01-05', progress: 0, type: 'task', dependencies: [], assignee: 'A', project: 'P' }];
    render(<GanttView tasks={tasks} {...baseProps} />);
    expect(mockD3.select).toHaveBeenCalled();
  });

  it('handles 100% progress', () => {
    const tasks: Task[] = [{ id: 't1', name: 'T', description: '', start_date: '2026-01-01', end_date: '2026-01-05', progress: 100, type: 'task', dependencies: [], assignee: 'A', project: 'P' }];
    render(<GanttView tasks={tasks} {...baseProps} />);
    expect(mockD3.select).toHaveBeenCalled();
  });

  it('renders 50 tasks without crashing', () => {
    const tasks: Task[] = Array.from({ length: 50 }, (_, i) => ({
      id: `t${i}`, name: `Task ${i}`, description: '', start_date: '2026-01-01', end_date: '2026-01-05',
      progress: i * 2, type: 'task' as const, dependencies: [], assignee: 'A', project: 'P',
    }));
    render(<GanttView tasks={tasks} {...baseProps} />);
    expect(mockD3.select).toHaveBeenCalled();
  });
});
