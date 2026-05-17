import { useCallback, useEffect } from 'react';
import * as d3 from 'd3';
import type { Task } from '../types';

const COLORS = { task: '#4A90D9', milestone: '#F5A623', project: '#7ED321' };
const ROW_H = 36;
const MARGIN = { top: 50, right: 20, bottom: 20, left: 160 };
const HANDLE_W = 6;

export function useGantt(
  svgRef: React.RefObject<SVGSVGElement | null>,
  tasks: Task[],
  visibleDays: number,
  onTaskUpdate?: (task: Task) => void,
  onTaskClick?: (task: Task) => void,
  onContextMenu?: (task: Task, e: React.MouseEvent | MouseEvent) => void
) {
  const render = useCallback(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const rect = svgRef.current.parentElement?.getBoundingClientRect();
    const W = Math.max((rect?.width ?? 900) - MARGIN.left - MARGIN.right, visibleDays * 40);
    const H = Math.max(tasks.length * ROW_H, 100);
    svg.attr('width', rect?.width ?? 900).attr('height', H + MARGIN.top + MARGIN.bottom);

    // Defs for arrows
    const defs = svg.append('defs');
    defs.append('marker').attr('id', 'arrow').attr('viewBox', '0 0 10 10')
      .attr('refX', 10).attr('refY', 5).attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
      .append('path').attr('d', 'M0,0 L10,5 L0,10 Z').attr('fill', '#999');

    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Scales
    const [minD, maxD] = d3.extent(tasks.flatMap(t => [+new Date(t.start_date), +new Date(t.end_date)])) as [number, number];
    const domainStart = d3.timeDay.offset(new Date(minD || Date.now()), -2);
    const domainEnd = d3.timeDay.offset(new Date(maxD || Date.now()), Math.max(visibleDays / 10, 5));
    const x = d3.scaleTime().domain([domainStart, domainEnd]).range([0, W]);
    const y = d3.scaleBand<Task>().domain(tasks).range([0, H]).padding(0.25);

    // Grid background for panning (zoom target) - behind all bars
    const panArea = g.append('rect').attr('class', 'pan-area')
      .attr('x', 0).attr('y', 0).attr('width', W).attr('height', H)
      .attr('fill', 'transparent').attr('cursor', 'grab')
      .style('pointer-events', 'all');  // only responds when no bar underneath

    // Grid lines
    const tickCount = Math.min(visibleDays, 20);
    g.append('g').selectAll('line').data(x.ticks(tickCount)).join('line')
      .attr('x1', d => x(d)).attr('x2', d => x(d)).attr('y1', 0).attr('y2', H)
      .attr('stroke', '#333').attr('stroke-dasharray', '3,3');

    // Axis
    const axisFmt = visibleDays <= 7 ? d3.timeFormat('%d %b') : visibleDays <= 60 ? d3.timeFormat('%b %d') : d3.timeFormat('%b %Y');
    g.append('g').attr('class', 'axis').call(d3.axisTop<Date>(x).ticks(tickCount).tickFormat(axisFmt as any));

    // Labels
    g.selectAll('.label').data(tasks).join('text')
      .attr('x', -8).attr('y', d => y(d)! + y.bandwidth() / 2)
      .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
      .attr('font-size', '12px').attr('fill', '#eee').text(d => d.name);

    // Task Bars Group
    const bars = g.selectAll('.bar').data(tasks).join('g').attr('class', 'bar');

    // Drag Behavior (Move)
    const dragMove = d3.drag<SVGGElement, Task>()
      .on('start', function (event) {
        d3.select(this).style('cursor', 'grabbing');
        event.sourceEvent.stopPropagation();  // Prevent zoom from receiving
      })
      .on('drag', function (event, d) {
        if (d.type === 'milestone') return;
        const daysDelta = Math.round(event.dx / (W / visibleDays));
        const startDate = d3.timeDay.offset(new Date(d.start_date), daysDelta);
        const endDate = d3.timeDay.offset(new Date(d.end_date), daysDelta);
        
        // Calculate new positions and clamp to viewport [0, W]
        let newX1 = x(startDate)!;
        let newX2 = x(endDate)!;
        const bw = Math.max(newX2 - newX1, 8);
        
        // Clamp to viewport bounds
        if (newX1 < 0) {
          newX1 = 0;
          newX2 = newX1 + bw;
        }
        if (newX2 > W) {
          newX2 = W;
          newX1 = newX2 - bw;
        }

        d3.select(this).select('.bar-rect').attr('x', newX1).attr('width', Math.max(newX2 - newX1, 8));
        d3.select(this).select('.handle-left').attr('x', newX1 - HANDLE_W / 2);
        d3.select(this).select('.handle-right').attr('x', newX2 - HANDLE_W / 2);
        d3.select(this).select('.progress-rect').attr('x', newX1).attr('width', (newX2 - newX1) * d.progress / 100);
      })
      .on('end', function (event, d) {
        d3.select(this).style('cursor', 'grab');
        if (d.type === 'milestone' || !onTaskUpdate) return;
        event.sourceEvent.stopPropagation();
        
        const daysDelta = Math.round(event.dx / (W / visibleDays));
        let startDate = d3.timeDay.offset(new Date(d.start_date), daysDelta);
        let endDate = d3.timeDay.offset(new Date(d.end_date), daysDelta);
        
        // Clamp dates to valid range
        let newX1 = x(startDate)!;
        let newX2 = x(endDate)!;
        if (newX1 < 0) {
          const daysShift = Math.round(-newX1 / (W / visibleDays));
          startDate = d3.timeDay.offset(startDate, daysShift);
          endDate = d3.timeDay.offset(endDate, daysShift);
        }
        if (newX2 > W) {
          const daysShift = Math.round((newX2 - W) / (W / visibleDays));
          startDate = d3.timeDay.offset(startDate, -daysShift);
          endDate = d3.timeDay.offset(endDate, -daysShift);
        }
        
        onTaskUpdate({
          ...d,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        });
      });

    // Drag Behavior (Resize Left) - changes start date, clamped to [0, end-8]
    const dragResizeLeft = d3.drag<SVGRectElement, Task>()
      .on('start', function (event) {
        d3.select(this).style('cursor', 'grabbing');
        event.sourceEvent.stopPropagation();
      })
      .on('drag', function (event, d) {
        if (d.type === 'milestone') return;
        const x2 = x(new Date(d.end_date))!;
        const newX1 = Math.max(0, Math.min(x2 - 8, event.x));
        
        const bw = x2 - newX1;
        const group = d3.select(this.parentNode as SVGElement);
        group.select('.bar-rect').attr('x', newX1).attr('width', bw);
        group.select('.progress-rect').attr('x', newX1).attr('width', bw * d.progress / 100);
        group.select('.handle-left').attr('x', newX1 - HANDLE_W / 2);
      })
      .on('end', function (event, d) {
        d3.select(this).style('cursor', 'ew-resize');
        if (d.type === 'milestone' || !onTaskUpdate) return;
        event.sourceEvent.stopPropagation();
        const x2 = x(new Date(d.end_date))!;
        const newX1 = Math.max(0, Math.min(x2 - 8, event.x));
        const startDate = x.invert(newX1);
        
        onTaskUpdate({
          ...d,
          start_date: startDate.toISOString().split('T')[0]
        });
      });

    // Drag Behavior (Resize Right) - changes end date, clamped to [start+8, W]
    const dragResizeRight = d3.drag<SVGRectElement, Task>()
      .on('start', function (event) {
        d3.select(this).style('cursor', 'grabbing');
        event.sourceEvent.stopPropagation();
      })
      .on('drag', function (event, d) {
        if (d.type === 'milestone') return;
        const x1 = x(new Date(d.start_date))!;
        const newX2 = Math.min(W, Math.max(x1 + 8, event.x));
        
        const bw = newX2 - x1;
        const group = d3.select(this.parentNode as SVGElement);
        group.select('.bar-rect').attr('width', bw);
        group.select('.progress-rect').attr('width', bw * d.progress / 100);
        group.select('.handle-right').attr('x', newX2 - HANDLE_W / 2);
      })
      .on('end', function (event, d) {
        d3.select(this).style('cursor', 'ew-resize');
        if (d.type === 'milestone' || !onTaskUpdate) return;
        event.sourceEvent.stopPropagation();
        const x1 = x(new Date(d.start_date))!;
        const newX2 = Math.min(W, Math.max(x1 + 8, event.x));
        const endDate = x.invert(newX2);
        
        onTaskUpdate({
          ...d,
          end_date: endDate.toISOString().split('T')[0]
        });
      });

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
          .attr('fill', color).attr('cursor', 'pointer')
          .on('click', (event, d) => {
            event.stopPropagation();
            if (onTaskClick) onTaskClick(d);
          })
          .on('contextmenu', (event, d) => {
            event.preventDefault();
            if (onContextMenu) onContextMenu(d, event);
          });
      } else {
        // Main Bar
        bar.append('rect').attr('class', 'bar-rect')
          .attr('x', x1).attr('y', yy).attr('width', bw).attr('height', bh)
          .attr('rx', 4).attr('fill', color).attr('cursor', 'grab')
          .call(dragMove as any)
          .on('click', (event, d) => {
            event.stopPropagation();
            if (onTaskClick) onTaskClick(d);
          })
          .on('contextmenu', (event, d) => {
            event.preventDefault();
            if (onContextMenu) onContextMenu(d, event);
          });

        // Progress Overlay
        bar.append('rect').attr('class', 'progress-rect')
          .attr('x', x1).attr('y', yy).attr('width', bw * t.progress / 100).attr('height', bh)
          .attr('rx', 4).attr('fill', d3.color(color)!.darker(0.8).toString()).attr('opacity', 0.5)
          .style('pointer-events', 'none');

        // Left Handle (Resize)
        bar.append('rect').attr('class', 'handle-left')
          .attr('x', x1 - HANDLE_W / 2).attr('y', yy).attr('width', HANDLE_W).attr('height', bh)
          .attr('fill', 'transparent').style('cursor', 'ew-resize')
          .call(dragResizeLeft as any);

        // Right Handle (Resize)
        bar.append('rect').attr('class', 'handle-right')
          .attr('x', x2 - HANDLE_W / 2).attr('y', yy).attr('width', HANDLE_W).attr('height', bh)
          .attr('fill', '#fff').attr('opacity', 0.5).style('cursor', 'ew-resize')
          .call(dragResizeRight as any);

        // Assignee Label
        bar.append('text').attr('x', x1 + 4).attr('y', yy + bh / 2 + 4)
          .attr('font-size', '10px').attr('fill', '#fff').style('pointer-events', 'none').text(t.assignee);
      }
    });

    // Dependency Arrows
    const taskMap = new Map(tasks.map(t => [t.id, t]));
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

    // Zoom behavior - apply only to pan-area rect, not whole SVG
    const zoom = d3.zoom<SVGRectElement, unknown>().scaleExtent([0.3, 5])
      .on('zoom', e => {
        g.attr('transform', `translate(${MARGIN.left + e.transform.x},${MARGIN.top})`);
        g.select('.axis').call(d3.axisTop<Date>(e.transform.rescaleX(x)).ticks(tickCount).tickFormat(axisFmt as any) as any);
      });
    panArea.call(zoom);

  }, [tasks, visibleDays, svgRef, onTaskUpdate, onTaskClick]);

  useEffect(() => {
    render();
  }, [render]);

  return { render };
}
