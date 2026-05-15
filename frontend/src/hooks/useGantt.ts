import { useCallback } from 'react';
import * as d3 from 'd3';
import type { Task } from '../types';

const COLORS = { task: '#4A90D9', milestone: '#F5A623', project: '#7ED321' };
const ROW_H = 36;
const MARGIN = { top: 50, right: 20, bottom: 20, left: 160 };

export function useGantt(svgRef: React.RefObject<SVGSVGElement | null>, tasks: Task[], visibleDays: number) {
  const render = useCallback(() => {
    if (!svgRef.current || tasks.length === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const rect = svgRef.current.parentElement?.getBoundingClientRect();
    const W = Math.max((rect?.width ?? 900) - MARGIN.left - MARGIN.right, visibleDays * 40);
    const H = tasks.length * ROW_H;
    svg.attr('width', rect?.width ?? 900).attr('height', H + MARGIN.top + MARGIN.bottom);

    const defs = svg.append('defs');
    defs.append('marker').attr('id', 'arrow').attr('viewBox', '0 0 10 10')
      .attr('refX', 10).attr('refY', 5).attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
      .append('path').attr('d', 'M0,0 L10,5 L0,10 Z').attr('fill', '#999');

    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    const [minD, maxD] = d3.extent(tasks.flatMap(t => [+new Date(t.start_date), +new Date(t.end_date)])) as [number, number];
    const domainStart = d3.timeDay.offset(new Date(minD), -2);
    const domainEnd = d3.timeDay.offset(new Date(maxD), Math.max(visibleDays / 10, 5));
    const x = d3.scaleTime().domain([domainStart, domainEnd]).range([0, W]);
    const y = d3.scaleBand<Task>().domain(tasks).range([0, H]).padding(0.25);

    const tickCount = Math.min(visibleDays, 20);
    g.append('g').selectAll('line').data(x.ticks(tickCount)).join('line')
      .attr('x1', d => x(d)).attr('x2', d => x(d)).attr('y1', 0).attr('y2', H)
      .attr('stroke', '#333').attr('stroke-dasharray', '3,3');

    const axisFmt = visibleDays <= 7 ? d3.timeFormat('%d %b') : visibleDays <= 60 ? d3.timeFormat('%b %d') : d3.timeFormat('%b %Y');
    g.append('g').call(d3.axisTop<Date>(x).ticks(tickCount).tickFormat(axisFmt as any) as any);

    g.selectAll('.label').data(tasks).join('text')
      .attr('x', -8).attr('y', d => y(d)! + y.bandwidth() / 2)
      .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
      .attr('font-size', '12px').attr('fill', '#eee').text(d => d.name);

    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const bars = g.selectAll('.bar').data(tasks).join('g').attr('class', 'bar');

    tasks.forEach(t => {
      const bar = bars.filter(d => d.id === t.id);
      const color = COLORS[t.type];
      const x1 = x(new Date(t.start_date))!, x2 = x(new Date(t.end_date))!;
      const yy = y(t)!, bw = Math.max(x2 - x1, 8), bh = y.bandwidth();

      if (t.type === 'milestone') {
        const cx = (x1 + x2) / 2, cy = yy + bh / 2, r = bh / 2;
        bar.append('polygon').attr('points', `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`)
          .attr('fill', color).attr('cursor', 'pointer');
      } else {
        bar.append('rect').attr('x', x1).attr('y', yy).attr('width', bw).attr('height', bh)
          .attr('rx', 4).attr('fill', color).attr('cursor', 'pointer');
        if (t.progress > 0) {
          bar.append('rect').attr('x', x1).attr('y', yy).attr('width', bw * t.progress / 100).attr('height', bh)
            .attr('rx', 4).attr('fill', d3.color(color)!.darker(0.8).toString()).attr('opacity', 0.5);
        }
      }
      bar.append('text').attr('x', x1 + 4).attr('y', yy + bh / 2 + 4)
        .attr('font-size', '10px').attr('fill', '#fff').text(t.assignee);
    });

    tasks.forEach(t => {
      t.dependencies.forEach(depId => {
        const dep = taskMap.get(depId);
        if (!dep) return;
        const sx = x(new Date(dep.end_date))!, sy = y(dep)! + y.bandwidth() / 2;
        const ex = x(new Date(t.start_date))!, ey = y(t)! + y.bandwidth() / 2;
        const mx = (sx + ex) / 2;
        g.append('path').attr('d', `M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex},${ey}`)
          .attr('fill', 'none').attr('stroke', '#999').attr('stroke-width', 1.5).attr('marker-end', 'url(#arrow)');
      });
    });

    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.3, 5])
      .on('zoom', e => {
        g.attr('transform', `translate(${MARGIN.left + e.transform.x},${MARGIN.top})`);
        g.select('.axis').call(d3.axisTop<Date>(e.transform.rescaleX(x)).ticks(tickCount).tickFormat(axisFmt as any) as any);
      });
    svg.call(zoom);
  }, [tasks, visibleDays, svgRef]);

  return { render };
}
