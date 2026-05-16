import { useRef } from 'react';
import { useGantt } from '../hooks/useGantt';
import { Task } from '../types';

interface Props {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskUpdate: (task: Task) => void;
  zoom: 'day' | 'week' | 'month' | 'quarter';
}

const zoomDays: Record<string, number> = { day: 14, week: 60, month: 180, quarter: 400 };

export default function GanttView({ tasks, onTaskClick, onTaskUpdate, zoom }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  useGantt(svgRef, tasks, zoomDays[zoom], onTaskUpdate, onTaskClick);

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto', position: 'relative' }}>
      <svg ref={svgRef} style={{ display: 'block' }} />
    </div>
  );
}
