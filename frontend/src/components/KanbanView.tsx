import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../types';

interface KanbanViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskUpdate: (id: string, data: Partial<Task>) => void;
}

function groupByAssignee(tasks: Task[]): Record<string, Task[]> {
  const map: Record<string, Task[]> = {};
  tasks.forEach((t) => {
    const key = t.assignee || 'Unassigned';
    (map[key] ??= []).push(t);
  });
  return map;
}

function Column({ id, tasks, onTaskClick }: { id: string; tasks: Task[]; onTaskClick: (t: Task) => void }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} style={{
      minWidth: 220, flex: 1, background: '#1e1e32', borderRadius: 8,
      padding: 8, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '100%', overflowY: 'auto',
    }}>
      <h3 style={{ margin: '4px 0 8px', color: '#ccc', fontSize: 13, textAlign: 'center' }}>{id}</h3>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        {tasks.map((t) => <TaskCard key={t.id} task={t} onClick={() => onTaskClick(t)} />)}
      </SortableContext>
    </div>
  );
}

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition, padding: 10, background: '#2a2a44', borderRadius: 6,
    cursor: 'grab', opacity: isDragging ? 0.4 : 1, fontSize: 12, color: '#ddd',
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onDoubleClick={onClick}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{task.name}</div>
      <div style={{ fontSize: 11, color: '#999' }}>{task.start_date} → {task.end_date}</div>
      <div style={{ marginTop: 6, height: 4, background: '#444', borderRadius: 2 }}>
        <div style={{ width: `${task.progress}%`, height: '100%', background: '#4A90D9', borderRadius: 2 }} />
      </div>
      <div style={{ fontSize: 10, color: '#777', marginTop: 4 }}>
        {task.dependencies.length > 0 ? `🔗 ${task.dependencies.length} deps` : ''}
      </div>
    </div>
  );
}

export default function KanbanView({ tasks, onTaskClick, onTaskUpdate }: KanbanViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const groups = groupByAssignee(tasks);
  const columns = Object.keys(groups);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const targetCol = over.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.assignee !== targetCol && targetCol !== 'Unassigned') {
      onTaskUpdate(taskId, { assignee: targetCol });
    } else if (task && targetCol === 'Unassigned' && task.assignee !== '') {
      onTaskUpdate(taskId, { assignee: '' });
    }
  };

  return (
    <DndContext onDragStart={({ active }) => setActiveId(active.id as string)} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, 1fr)`, gap: 12, padding: 12, height: '100%', overflow: 'auto' }}>
        {columns.map((col) => <Column key={col} id={col} tasks={groups[col]} onTaskClick={onTaskClick} />)}
      </div>
      <DragOverlay>{activeId ? <div style={{ padding: 10, background: '#3a3a5e', borderRadius: 6, color: '#ddd', fontSize: 12 }}>
        {tasks.find((t) => t.id === activeId)?.name}
      </div> : null}</DragOverlay>
    </DndContext>
  );
}
