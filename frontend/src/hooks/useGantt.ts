import { useRef, useCallback, useEffect } from 'react';
import * as d3 from 'd3';
import type { Task } from '../types';

const COLORS = { task: '#4A90D9', milestone: '#F5A623', project: '#7ED321' };
const ROW_H = 36;
const MARGIN = { top: 50, right: 20, bottom: 20, left: 160 };

interface UseGanttReturn {
  svgRef: React.RefObject<SVGSVGElement | null>;
  render: (tasks: Task[]) => void;
}

export function useGantt(): UseGanttReturn {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const render = useCallback((tasks: Task[]) => {
    if (!svgRef.current || tasks.length === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const rect = svgRef.current.parentElement?.getBoundingClientRect();
    const W = (rect?.width ?? 900) - MARGIN.left - MARGIN.right;
    const H = tasks.length * ROW_H;
    const totalH = H + MARGIN.top + MARGIN.bottom;

    svg.attr('width', rect?.width ?? 900).attr('height', totalH);

    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrow').attr('viewBox', '0 0 10 10')
      .attr('refX', 10).attr('refY', 5)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path').attr('d', 'M0,0 L10,5 L0,10 Z').attr('fill', '#999');

    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    const dates = tasks.flatMap(t => [new Date(t.start_date), new Date(t.end_date)]);
    const x = d3.scaleTime()
      .domain([d3.min(dates)!, d3.timeDay.offset(d3.max(dates)!, 1)])
      .range([0, W]);

    const y = d3.scaleBand<Task>()
      .domain(tasks)
      .range([0, H])
      .padding(0.25);

    // Grid
    g.append('g').attr('class', 'grid')
      .selectAll('line').data(x.ticks()).join('line')
      .attr('x1', d => x(d)).attr('x2', d => x(d))
      .attr('y1', 0).attr('y2', H)
      .attr('stroke', '#e0e0e0').attr('stroke-dasharray', '3,3');

    // X axis
    const makeAxis = (scale: d3.ScaleTime<number, number>) =>
      d3.axisTop(scale).ticks(8).tickFormat(d3.timeFormat('%b %d') as any);
    g.append('g').attr('class', 'axis').call(makeAxis(x));

    // Labels
    g.selectAll('.label').data(tasks).join('text')
      .attr('x', -8).attr('y', d => (y(d)! + y.bandwidth() / 2))
      .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
      .attr('font-size', '12px').text(d => d.name);

    // Task bars
    const bars = g.selectAll('.bar').data(tasks).join('g').attr('class', 'bar');

    tasks.forEach(t => {
      const bar = bars.filter(d => d.id === t.id);
      const color = COLORS[t.type];
      const x1 = x(new Date(t.start_date))!;
      const x2 = x(new Date(t.end_date))!;
      const yy = y(t)!;
      const bw = Math.max(x2 - x1, 8);
      const bh = y.bandwidth();

      if (t.type === 'milestone') {
        const cx = (x1 + x2) / 2, cy = yy + bh / 2, r = bh / 2;
        bar.append('polygon')
          .attr('points', `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`)
          .attr('fill', color).attr('cursor', 'pointer');
      } else {
        bar.append('rect')
          .attr('x', x1).attr('y', yy).attr('width', bw).attr('height', bh)
          .attr('rx', 4).attr('fill', color).attr('cursor', 'pointer');
        if (t.progress > 0) {
          bar.append('rect')
            .attr('x', x1).attr('y', yy).attr('width', bw * t.progress / 100).attr('height', bh)
            .attr('rx', 4).attr('fill', d3.color(color)!.darker(0.8).toString()).attr('opacity', 0.5);
        }
      }
    });

    // Dependency arrows
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    tasks.forEach(t => {
      t.dependencies.forEach(depId => {
        const dep = taskMap.get(depId);
        if (!dep) return;
        const sx = x(new Date(dep.end_date))!;
        const sy = y(dep)! + y.bandwidth() / 2;
        const ex = x(new Date(t.start_date))!;
        const ey = y(t)! + y.bandwidth() / 2;
        const mx = (sx + ex) / 2;
        g.append('path')
          .attr('d', `M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex},${ey}`)
          .attr('fill', 'none').attr('stroke', '#999').attr('stroke-width', 1.5)
          .attr('marker-end', 'url(#arrow)');
      });
    });

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .on('zoom', (event) => {
        g.attr('transform', `translate(${MARGIN.left + event.transform.x},${MARGIN.top})`);
        const newX = event.transform.rescaleX(x);
        (g.select('.axis') as any).call(makeAxis(newX));
        g.select('.grid').selectAll('line')
          .attr('x1', d => newX(d as Date)).attr('x2', d => newX(d as Date));
      });
    svg.call(zoom);
    zoomRef.current = zoom;
  }, []);

  useEffect(() => {
    const handleResize = () => { /* re-render on resize handled by parent */ };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { svgRef, render };
}
