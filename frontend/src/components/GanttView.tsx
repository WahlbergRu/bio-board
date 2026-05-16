import { useRef, useEffect } from 'react';
import { useGantt } from '../hooks/useGantt';
import { Task } from '../types';

interface Props {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskUpdate: (task: Task) => void;
  onContextMenu: (task: Task, e: MouseEvent | React.MouseEvent) => void;
  zoom: 'day' | 'week' | 'month' | 'quarter';
}

const zoomDays: Record<string, number> = { day: 14, week: 60, month: 180, quarter: 400 };

export default function GanttView({ tasks, onTaskClick, onTaskUpdate, onContextMenu, zoom }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { render } = useGantt(svgRef, tasks, zoomDays[zoom], onTaskUpdate, onTaskClick, onContextMenu);

  // Handle Resize
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(() => {
      render();
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [render]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'auto', position: 'relative' }}>
      <svg ref={svgRef} style={{ display: 'block' }} />
    </div>
  );
}
