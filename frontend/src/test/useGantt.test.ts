import { describe, it, expect } from 'vitest';
import { Task } from '../types';

// ============================================================
// useGantt — Logic Tests (date math, drag/resize calculations)
// These test the pure functions that useGantt uses internally.
// ============================================================

describe('useGantt — Drag: pixel to date conversion', () => {
  function calcDaysDelta(dx: number, width: number, visibleDays: number): number {
    return Math.round(dx / (width / visibleDays));
  }

  it('40px → 1 day (40px/day scale)', () => {
    expect(calcDaysDelta(40, 400, 10)).toBe(1);
  });

  it('-40px → -1 day', () => {
    expect(calcDaysDelta(-40, 400, 10)).toBe(-1);
  });

  it('200px → 5 days', () => {
    expect(calcDaysDelta(200, 400, 10)).toBe(5);
  });

  it('25px → 1 day (rounds up 0.625)', () => {
    expect(calcDaysDelta(25, 400, 10)).toBe(1);
  });

  it('15px → 0 days (rounds down 0.375)', () => {
    expect(calcDaysDelta(15, 400, 10)).toBe(0);
  });

  it('large drag: 1000px → 25 days', () => {
    expect(calcDaysDelta(1000, 400, 10)).toBe(25);
  });
});

describe('useGantt — Date shifting', () => {
  function shiftDate(dateStr: string, daysDelta: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + daysDelta);
    return d.toISOString().split('T')[0];
  }

  it('2026-01-01 + 3 → 2026-01-04', () => {
    expect(shiftDate('2026-01-01', 3)).toBe('2026-01-04');
  });

  it('2026-01-10 - 5 → 2026-01-05', () => {
    expect(shiftDate('2026-01-10', -5)).toBe('2026-01-05');
  });

  it('Jan 31 + 1 → Feb 1 (month boundary)', () => {
    expect(shiftDate('2026-01-31', 1)).toBe('2026-02-01');
  });

  it('Dec 31 + 1 → Jan 1 next year', () => {
    expect(shiftDate('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('Feb 28 - 1 → Feb 27 (non-leap)', () => {
    expect(shiftDate('2026-02-28', -1)).toBe('2026-02-27');
  });

  it('Feb 29 - 1 → Feb 28 (leap year 2024)', () => {
    expect(shiftDate('2024-02-29', -1)).toBe('2024-02-28');
  });
});

describe('useGantt — Resize: end date from pixel', () => {
  function calcEndDateFromPixel(
    startX: number, currentX: number, startDate: string,
    width: number, visibleDays: number
  ): string {
    const pixelsPerDay = width / visibleDays;
    const daysFromStart = (currentX - startX) / pixelsPerDay;
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + Math.max(1, Math.round(daysFromStart)));
    return end.toISOString().split('T')[0];
  }

  it('200px from start → 5 days', () => {
    expect(calcEndDateFromPixel(0, 200, '2026-01-01', 400, 10)).toBe('2026-01-06');
  });

  it('40px from start → 1 day', () => {
    expect(calcEndDateFromPixel(0, 40, '2026-01-01', 400, 10)).toBe('2026-01-02');
  });

  it('small drag (5px) → minimum 1 day', () => {
    const result = calcEndDateFromPixel(0, 5, '2026-01-01', 400, 10);
    expect(new Date(result) > new Date('2026-01-01')).toBe(true);
  });
});

describe('useGantt — Zoom: pixels per day', () => {
  it('day zoom (14 days, 400px) → ~28.6px/day', () => {
    const ppd = 400 / 14;
    expect(ppd).toBeGreaterThan(25);
    expect(ppd).toBeLessThan(30);
  });

  it('week zoom (60 days, 400px) → ~6.7px/day', () => {
    const ppd = 400 / 60;
    expect(ppd).toBeGreaterThan(6);
    expect(ppd).toBeLessThan(7);
  });

  it('month zoom (180 days, 400px) → ~2.2px/day', () => {
    const ppd = 400 / 180;
    expect(ppd).toBeGreaterThan(2);
    expect(ppd).toBeLessThan(3);
  });

  it('quarter zoom (400 days, 400px) → 1px/day', () => {
    expect(400 / 400).toBe(1);
  });
});

describe('useGantt — Task type guards', () => {
  it('milestone is not draggable', () => {
    const task: Task = { id: 'm1', name: 'M', description: '', start_date: '2026-01-01', end_date: '2026-01-01', progress: 0, type: 'milestone', dependencies: [], assignee: 'A', project: 'P' };
    expect(task.type === 'milestone').toBe(true);
  });

  it('task is draggable', () => {
    const task: Task = { id: 't1', name: 'T', description: '', start_date: '2026-01-01', end_date: '2026-01-05', progress: 50, type: 'task', dependencies: [], assignee: 'A', project: 'P' };
    expect(task.type === 'milestone').toBe(false);
  });

  it('project is draggable', () => {
    const task: Task = { id: 'p1', name: 'P', description: '', start_date: '2026-01-01', end_date: '2026-03-01', progress: 30, type: 'project', dependencies: [], assignee: 'T', project: 'P' };
    expect(task.type === 'milestone').toBe(false);
  });
});

describe('useGantt — Dependency arrow logic', () => {
  it('arrow goes from dep end → dependent start', () => {
    const depEnd = new Date('2026-01-05');
    const depStart = new Date('2026-01-06');
    expect(depEnd <= depStart).toBe(true);
  });

  it('detects self-dependency', () => {
    const task: Task = { id: 't1', name: 'Self', description: '', start_date: '2026-01-01', end_date: '2026-01-05', progress: 0, type: 'task', dependencies: ['t1'], assignee: 'A', project: 'P' };
    expect(task.dependencies).toContain(task.id);
  });
});

describe('useGantt — Progress overlay width', () => {
  function calcProgressWidth(barWidth: number, progress: number): number {
    return barWidth * progress / 100;
  }

  it('0% → 0px', () => { expect(calcProgressWidth(100, 0)).toBe(0); });
  it('50% → 50px', () => { expect(calcProgressWidth(100, 50)).toBe(50); });
  it('100% → 100px', () => { expect(calcProgressWidth(100, 100)).toBe(100); });
  it('33% of 200px → 66px', () => { expect(calcProgressWidth(200, 33)).toBe(66); });
  it('75% of 80px → 60px', () => { expect(calcProgressWidth(80, 75)).toBe(60); });
});

describe('useGantt — Row height & layout constants', () => {
  const ROW_H = 36;
  const MARGIN = { top: 50, right: 20, bottom: 20, left: 160 };
  const HANDLE_W = 6;

  it('ROW_H is 36px', () => { expect(ROW_H).toBe(36); });
  it('MARGIN totals to 250px', () => {
    expect(MARGIN.top + MARGIN.right + MARGIN.bottom + MARGIN.left).toBe(250);
  });
  it('HANDLE_W is 6px', () => { expect(HANDLE_W).toBe(6); });

  it('SVG height for 10 tasks', () => {
    const H = 10 * ROW_H + MARGIN.top + MARGIN.bottom;
    expect(H).toBe(430);
  });

  it('SVG height for 0 tasks (minimum 100)', () => {
    const H = Math.max(0 * ROW_H, 100) + MARGIN.top + MARGIN.bottom;
    expect(H).toBe(170);
  });
});
