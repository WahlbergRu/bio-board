import { DndContext, closestCorners, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../types';
import { ui } from '../i18n';

interface Props {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onReassign: (taskId: string, newAssignee: string) => void;
}

function TaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, padding: 8, marginBottom: 6, background: '#2a2a4e', borderRadius: 6, cursor: 'grab', border: '1px solid #333' };
  const colors: Record<string, string> = { task: '#4A90D9', milestone: '#F5A623', project: '#7ED321' };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={() => {}}>
      <div style={{ fontWeight: 600, fontSize: 13, color: '#eee' }}>{task.name}</div>
      <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{task.start_date} → {task.end_date}</div>
      <div style={{ height: 3, background: '#444', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
        <div style={{ width: `${task.progress}%`, height: '100%', background: colors[task.type] || '#4A90D9', borderRadius: 2 }} />
      </div>
      {task.dependencies.length > 0 && (
        <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>⛓ {task.dependencies.length} завис.</div>
      )}
    </div>
  );
}

function Column({ assignee, tasks, onTaskClick }: { assignee: string; tasks: Task[]; onTaskClick: (t: Task) => void }) {
  return (
    <div style={{ background: '#1e1e3a', borderRadius: 8, padding: 8, minHeight: 200 }}>
      <h3 style={{ fontSize: 13, color: '#ccc', margin: '0 0 8px', textAlign: 'center' }}>
        {assignee || ui.noAssignee} <span style={{ color: '#666' }}>({tasks.length} {ui.tasks})</span>
      </h3>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        {tasks.map(t => (
          <div key={t.id} onClick={() => onTaskClick(t)}>
            <TaskCard task={t} />
          </div>
        ))}
      </SortableContext>
    </div>
  );
}

export default function KanbanView({ tasks, onTaskClick, onReassign }: Props) {
  const assignees = Array.from(new Set(tasks.map(t => t.assignee).filter(Boolean)));
  const grouped: Record<string, Task[]> = {};
  assignees.forEach(a => { grouped[a] = tasks.filter(t => t.assignee === a); });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const overColumn = over.id as string;
    if (assignees.includes(overColumn)) onReassign(taskId, overColumn);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(assignees.length, 1)}, minmax(220px, 1fr))`, gap: 12, padding: 12, overflowX: 'auto', minHeight: 400 }}>
      <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        {Object.entries(grouped).map(([a, t]) => <Column key={a} assignee={a} tasks={t} onTaskClick={onTaskClick} />)}
        {assignees.length === 0 && <div style={{ color: '#666', gridColumn: '1 / -1', textAlign: 'center', padding: 40 }}>{ui.noTasks}</div>}
      </DndContext>
    </div>
  );
}
