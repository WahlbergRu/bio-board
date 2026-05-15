import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useGantt } from '../hooks/useGantt';
import type { Task } from '../types';

interface GanttViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskUpdate: (task: Task) => void;
}

interface TooltipData {
  task: Task;
  x: number;
  y: number;
}

export default function GanttView({ tasks, onTaskClick }: GanttViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { svgRef, render } = useGantt();
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  useEffect(() => {
    render(tasks);
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const handleClick = (e: MouseEvent) => {
      const bar = (e.target as Element).closest('.bar');
      if (!bar) return;
      const taskEl = bar as SVGGElement;
      const taskId = d3.select(taskEl.parentNode as Element).datum() as Task | undefined;
      if (taskId) onTaskClick(taskId);
    };

    const handleMove = (e: MouseEvent) => {
      const bar = (e.target as Element).closest('.bar');
      if (!bar) { setTooltip(null); return; }
      const task = d3.select((bar as SVGGElement).parentNode as Element).datum() as Task | undefined;
      if (!task) return;
      const rect = containerRef.current?.getBoundingClientRect();
      setTooltip({ task, x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) });
    };

    const handleLeave = () => setTooltip(null);

    svg.addEventListener('click', handleClick);
    svg.addEventListener('mousemove', handleMove);
    svg.addEventListener('mouseleave', handleLeave);
    return () => {
      svg.removeEventListener('click', handleClick);
      svg.removeEventListener('mousemove', handleMove);
      svg.removeEventListener('mouseleave', handleLeave);
    };
  }, [tasks, render, onTaskClick]);

  useEffect(() => {
    const obs = new ResizeObserver(() => render(tasks));
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [tasks, render]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', overflow: 'auto', background: '#fafafa', borderRadius: 8 }}>
      <svg ref={svgRef as React.RefObject<SVGSVGElement>} />
      {tooltip && (
        <div style={{
          position: 'absolute', left: tooltip.x + 12, top: tooltip.y - 10,
          background: '#fff', border: '1px solid #ccc', borderRadius: 6,
          padding: '8px 12px', fontSize: 12, pointerEvents: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)', zIndex: 10, whiteSpace: 'nowrap',
        }}>
          <strong>{tooltip.task.name}</strong><br />
          {tooltip.task.start_date} → {tooltip.task.end_date}<br />
          Assignee: {tooltip.task.assignee || '—'}<br />
          Progress: {tooltip.task.progress}%
        </div>
      )}
    </div>
  );
}
