import { useCallback, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { Task } from '../types';

const COLORS = { task: '#4A90D9', milestone: '#F5A623', project: '#7ED321' };
const ROW_H = 36;
const MARGIN = { top: 50, right: 20, bottom: 20, left: 160 };
const HANDLE_W = 6;

// Local date format — avoids UTC timezone shift
const fmtDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

export function useGantt(
  svgRef: React.RefObject<SVGSVGElement | null>,
  tasks: Task[],
  visibleDays: number,
  onTaskUpdate?: (task: Task) => void,
  onTaskClick?: (task: Task) => void,
  onContextMenu?: (task: Task, e: React.MouseEvent | MouseEvent) => void
) {
  const isInitialRender = useRef(true);

  // Stable refs for callbacks
  const onTaskUpdateRef = useRef(onTaskUpdate);
  const onTaskClickRef = useRef(onTaskClick);
  const onContextMenuRef = useRef(onContextMenu);
  onTaskUpdateRef.current = onTaskUpdate;
  onTaskClickRef.current = onTaskClick;
  onContextMenuRef.current = onContextMenu;

  const panRef = useRef<{ tx: number; ty: number; k: number }>({ tx: 0, ty: 0, k: 1 });

  const render = useCallback(() => {
    if (!svgRef.current) return;
    const validTasks = tasks.filter(t => t.start_date && t.end_date);
    const svg = d3.select(svgRef.current);
    
    // Don't wipe everything on zoom — only on initial render or data change
    if (isInitialRender.current) {
      svg.selectAll('*').remove();
      isInitialRender.current = false;
    } else {
      // Only remove content layers, keep structure
      svg.select('.gantt-content').remove();
      svg.select('.axis-group').remove();
    }

    const rect = svgRef.current.parentElement?.getBoundingClientRect();
    const containerH = rect?.height ?? 400;
    const W = Math.max((rect?.width ?? 900) - MARGIN.left - MARGIN.right, visibleDays * 40);
    const tasksH = Math.max(validTasks.length * ROW_H, 100);
    const H = Math.max(containerH - MARGIN.top - MARGIN.bottom, tasksH);
    svg.attr('width', rect?.width ?? 900).attr('height', containerH);

    // Defs for arrows — always recreate on render
    svg.selectAll('defs').remove();
    const defs = svg.append('defs');
    defs.append('marker').attr('id', 'arrow').attr('viewBox', '0 0 10 10')
      .attr('refX', 10).attr('refY', 5).attr('markerWidth', 7).attr('markerHeight', 7).attr('orient', 'auto')
      .append('path').attr('d', 'M0,0 L10,5 L0,10 Z').attr('fill', '#fff');

    // Scales
    const dates = validTasks.flatMap(t => [+new Date(t.start_date), +new Date(t.end_date)]);
    const [minD, maxD] = validTasks.length
      ? (d3.extent(dates) as [number, number])
      : [Date.now(), Date.now()];
    const taskSpan = Math.ceil((maxD! - minD!) / (1000 * 60 * 60 * 24));
    const extra = visibleDays <= 14 ? 3 : visibleDays <= 60 ? 7 : 30;
    const domainStart = d3.timeDay.offset(new Date(minD || Date.now()), -2);
    const domainEnd = d3.timeDay.offset(domainStart, Math.max(taskSpan + extra, visibleDays));
    const x = d3.scaleTime().domain([domainStart, domainEnd]).range([0, W]);
    const y = d3.scaleBand<Task>().domain(validTasks).range([0, tasksH]).padding(0.25);

    // Create main content group with zoom transform
    const g = svg.append('g').attr('class', 'gantt-content')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Pan area (background for zoom/pan)
    g.append('rect').attr('class', 'pan-area')
      .attr('x', 0).attr('y', 0).attr('width', W).attr('height', H)
      .attr('fill', 'transparent').style('cursor', 'grab')
      .lower(); // Send to back so bars are clickable

    // Axis group
    const axisGroup = svg.append('g').attr('class', 'axis-group')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Grid lines
    const tickInterval = visibleDays <= 14 ? d3.timeDay : visibleDays <= 60 ? d3.timeWeek : d3.timeMonth;
    const axisTicks = x.ticks(tickInterval);
    axisGroup.append('g').selectAll('line').data(axisTicks).join('line')
      .attr('x1', d => x(d)).attr('x2', d => x(d)).attr('y1', 0).attr('y2', H)
      .attr('stroke', '#555').attr('stroke-opacity', '0.4').attr('stroke-dasharray', '3,3');

    // Axis
    const axisFmt = visibleDays <= 7 ? d3.timeFormat('%d %b') : visibleDays <= 60 ? d3.timeFormat('%b %d') : d3.timeFormat('%b %Y');
    axisGroup.append('g').attr('class', 'axis').call(d3.axisTop<Date>(x).ticks(tickInterval).tickFormat(axisFmt as any));

    // Labels
    g.selectAll('.label').data(validTasks).join('text')
      .attr('x', -8).attr('y', d => y(d)! + y.bandwidth() / 2)
      .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
      .attr('font-size', '12px').attr('fill', '#eee').text(d => d.name);

    // Task Bars Group
    const bars = g.selectAll('.bar').data(validTasks).join('g').attr('class', 'bar');

    // Drag Behavior (Move)
    const dragMove = d3.drag<SVGGElement, Task>()
      .filter(event => event.button === 0 && !event.ctrlKey)
      .clickDistance(3)
      .on('start', function (event) {
        d3.select(this).style('cursor', 'grabbing');
        event.sourceEvent.stopPropagation();
      })
      .on('drag', function (event, d) {
        if (d.type === 'milestone') return;
        const zoomScale = panRef.current.k;
        const pixelsPerDay = (W / visibleDays) * zoomScale;
        const daysDelta = Math.round(event.dx / pixelsPerDay);
        const startDate = d3.timeDay.offset(new Date(d.start_date), daysDelta);
        const endDate = d3.timeDay.offset(new Date(d.end_date), daysDelta);
        
        let visX1 = x(startDate)!;
        let visX2 = x(endDate)!;
        const bw = Math.max(visX2 - visX1, 8);
        
        if (visX1 < 0) { visX1 = 0; visX2 = visX1 + bw; }
        if (visX2 > W) { visX2 = W; visX1 = visX2 - bw; }

        d3.select(this).select('.bar-rect').attr('x', visX1).attr('width', Math.max(visX2 - visX1, 8));
        d3.select(this).select('.handle-left').attr('x', visX1 - HANDLE_W / 2);
        d3.select(this).select('.handle-right').attr('x', visX2 - HANDLE_W / 2);
        d3.select(this).select('.progress-rect').attr('x', visX1).attr('width', (visX2 - visX1) * d.progress / 100);
      })
      .on('end', function (event, d) {
        d3.select(this).style('cursor', 'grab');
        if (d.type === 'milestone' || !onTaskUpdateRef.current) return;
        event.sourceEvent.stopPropagation();
        
        const zoomScale = panRef.current.k;
        const pixelsPerDay = (W / visibleDays) * zoomScale;
        const daysDelta = Math.round(event.dx / pixelsPerDay);
        let startDate = d3.timeDay.offset(new Date(d.start_date), daysDelta);
        let endDate = d3.timeDay.offset(new Date(d.end_date), daysDelta);
        
        const ppd = W / visibleDays;
        let px1 = x(startDate)!;
        let px2 = x(endDate)!;
        
        if (px1 < 0) {
          const daysShift = Math.ceil(-px1 / ppd);
          startDate = d3.timeDay.offset(startDate, daysShift);
          endDate = d3.timeDay.offset(endDate, daysShift);
        }
        if (px2 > W) {
          const daysShift = Math.ceil((px2 - W) / ppd);
          startDate = d3.timeDay.offset(startDate, -daysShift);
          endDate = d3.timeDay.offset(endDate, -daysShift);
        }
        
        const newStart = fmtDate(startDate);
        const newEnd = fmtDate(endDate);
        if (newStart !== d.start_date || newEnd !== d.end_date) {
          onTaskUpdateRef.current({ ...d, start_date: newStart, end_date: newEnd });
        }
      });

    // Drag Behavior (Resize Left)
    const dragResizeLeft = d3.drag<SVGRectElement, Task>()
      .filter(event => event.button === 0 && !event.ctrlKey)
      .clickDistance(3)
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
        if (d.type === 'milestone' || !onTaskUpdateRef.current) return;
        event.sourceEvent.stopPropagation();
        const x2 = x(new Date(d.end_date))!;
        const newX1 = Math.max(0, Math.min(x2 - 8, event.x));
        const startDate = x.invert(newX1);
        const newStart = fmtDate(startDate);
        if (newStart !== d.start_date) {
          onTaskUpdateRef.current({ ...d, start_date: newStart });
        }
      });

    // Drag Behavior (Resize Right)
    const dragResizeRight = d3.drag<SVGRectElement, Task>()
      .filter(event => event.button === 0 && !event.ctrlKey)
      .clickDistance(3)
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
        if (d.type === 'milestone' || !onTaskUpdateRef.current) return;
        event.sourceEvent.stopPropagation();
        const x1 = x(new Date(d.start_date))!;
        const newX2 = Math.min(W, Math.max(x1 + 8, event.x));
        const endDate = x.invert(newX2);
        const newEnd = fmtDate(endDate);
        if (newEnd !== d.end_date) {
          onTaskUpdateRef.current({ ...d, end_date: newEnd });
        }
      });

    validTasks.forEach(t => {
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
          .on('click', (event, d) => { event.stopPropagation(); if (onTaskClickRef.current) onTaskClickRef.current(d); })
          .on('dblclick', (event, d) => { event.stopPropagation(); if (onTaskClickRef.current) onTaskClickRef.current(d); })
          .on('contextmenu', (event, d) => { event.preventDefault(); if (onContextMenuRef.current) onContextMenuRef.current(d, event); });
      } else {
        bar.append('rect').attr('class', 'bar-rect')
          .attr('x', x1).attr('y', yy).attr('width', bw).attr('height', bh)
          .attr('rx', 4).attr('fill', color).attr('cursor', 'grab')
          .call(dragMove as any)
          .on('click', (event, d) => { event.stopPropagation(); if (onTaskClickRef.current) onTaskClickRef.current(d); })
          .on('dblclick', (event, d) => { event.stopPropagation(); if (onTaskClickRef.current) onTaskClickRef.current(d); })
          .on('contextmenu', (event, d) => { event.preventDefault(); if (onContextMenuRef.current) onContextMenuRef.current(d, event); });

        bar.append('rect').attr('class', 'progress-rect')
          .attr('x', x1).attr('y', yy).attr('width', bw * t.progress / 100).attr('height', bh)
          .attr('rx', 4).attr('fill', d3.color(color)!.darker(0.8).toString()).attr('opacity', 0.5)
          .style('pointer-events', 'none');

        bar.append('rect').attr('class', 'handle-left')
          .attr('x', x1 - HANDLE_W / 2).attr('y', yy).attr('width', HANDLE_W).attr('height', bh)
          .attr('fill', 'transparent').style('cursor', 'ew-resize')
          .call(dragResizeLeft as any);

        bar.append('rect').attr('class', 'handle-right')
          .attr('x', x2 - HANDLE_W / 2).attr('y', yy).attr('width', HANDLE_W).attr('height', bh)
          .attr('fill', '#fff').attr('opacity', 0.5).style('cursor', 'ew-resize')
          .call(dragResizeRight as any);

        bar.append('text').attr('x', x1 + 4).attr('y', yy + bh / 2 + 4)
          .attr('font-size', '10px').attr('fill', '#fff').style('pointer-events', 'none').text(t.assignee);
      }
    });

    // Dependency Arrows - draw AFTER bars so they appear on top
    const taskMap = new Map(validTasks.map(t => [t.id, t]));
    validTasks.forEach(t => {
      t.dependencies.forEach(depId => {
        const dep = taskMap.get(depId);
        if (!dep) return;
        const depX1 = x(new Date(dep.start_date))!;
        const depX2 = x(new Date(dep.end_date))!;
        const depBw = Math.max(depX2 - depX1, 8);
        const depBh = y.bandwidth();
        // Source: right edge of source shape
        // For milestone (diamond): right point is at cx + r = x1 + bh/2
        // For task (bar): right edge is at x2
        const sx = dep.type === 'milestone'
          ? depX1 + depBh / 2
          : depX1 + depBw;
        const sy = y(dep)! + depBh / 2;
        // Target: left edge of target shape
        const tX1 = x(new Date(t.start_date))!;
        const tBh = y.bandwidth();
        const ex = t.type === 'milestone'
          ? tX1 - tBh / 2
          : tX1;
        const ey = y(t)! + tBh / 2;
        const mx = (sx + ex) / 2;
        const arrowLen = t.type === 'milestone' ? 5 : 8;
        // Line stops before target, triangle drawn separately pointing right
        g.append('path').attr('d', `M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex - arrowLen},${ey}`)
          .attr('fill', 'none').attr('stroke', '#fff').attr('stroke-width', 2).attr('opacity', 0.7);
        // Triangle arrowhead pointing right into target
        g.append('polygon')
          .attr('points', `${ex - arrowLen},${ey - 5} ${ex + 2},${ey} ${ex - arrowLen},${ey + 5}`)
          .attr('fill', '#fff').attr('opacity', 0.7);
      });
    });

    // Zoom & pan behavior — attached to pan area only
    const panArea = g.select('.pan-area');
    if (!panArea.empty()) {
      const svg = svgRef.current;
      panArea
        .on('mousedown.pan', function(event) {
          const p = panRef.current;
          const startX = event.clientX - p.tx;
          const startY = event.clientY - p.ty;
          const svgNode = svg!;
          const onMove = (e: MouseEvent) => {
            p.tx = e.clientX - startX;
            p.ty = e.clientY - startY;
            d3.select(svgNode).select('.gantt-content')
              .attr('transform', `translate(${MARGIN.left + p.tx},${MARGIN.top + p.ty}) scale(${p.k})`);
            d3.select(svgNode).select('.axis-group')
              .attr('transform', `translate(${MARGIN.left + p.tx},${MARGIN.top}) scale(${p.k}, 1)`);
          };
          const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
          };
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
          event.preventDefault();
        });

      const panNode = panArea.node();
      if (panNode) (panNode as HTMLElement).addEventListener('wheel', (event: Event) => {
        const e = event as WheelEvent;
        e.preventDefault();
        const p = panRef.current;
        const delta = -e.deltaY * (e.deltaMode === 1 ? 0.05 : e.deltaMode === 2 ? 1.0 : 0.002);
        const newK = Math.min(5, Math.max(0.3, p.k * (1 + delta)));
        const svgRect = svg!.getBoundingClientRect();
        const cx = e.clientX - svgRect.left;
        const cy = e.clientY - svgRect.top;
        p.tx = cx - (cx - p.tx) * (newK / p.k);
        p.ty = cy - (cy - p.ty) * (newK / p.k);
        p.k = newK;
        d3.select(svg!).select('.gantt-content')
          .attr('transform', `translate(${MARGIN.left + p.tx},${MARGIN.top + p.ty}) scale(${p.k})`);
        d3.select(svg!).select('.axis-group')
          .attr('transform', `translate(${MARGIN.left + p.tx},${MARGIN.top}) scale(${p.k}, 1)`);
      }, { passive: false });
    }
  }, [tasks, visibleDays, svgRef]);

  useEffect(() => {
    // Reset pan/zoom when visibleDays changes
    panRef.current = { tx: 0, ty: 0, k: 1 };
    if (svgRef.current) {
      d3.select(svgRef.current).select('.gantt-content')
        .attr('transform', `translate(${MARGIN.left},${MARGIN.top}) scale(1)`);
      d3.select(svgRef.current).select('.axis-group')
        .attr('transform', `translate(${MARGIN.left},${MARGIN.top}) scale(1, 1)`);
    }
  }, [visibleDays]);

  useEffect(() => {
    isInitialRender.current = true;
    render();
  }, [render]);

  return { render };
}
