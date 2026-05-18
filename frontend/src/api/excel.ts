import { client } from './client';
import { Task } from '../types';

export async function uploadExcel(file: File): Promise<{ count: number }> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await client.post('/excel/upload', fd);
  const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
  return { count: data.count ?? data.imported ?? 0 };
}

export function exportExcel() {
  client.get('/excel/export', { responseType: 'blob' }).then(res => {
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url; a.download = 'plan.xlsx'; a.click();
    URL.revokeObjectURL(url);
  });
}

export function exportIcal(tasks: Task[]) {
  let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//AI Gantt Planner//EN\n';
  tasks.forEach(t => {
    ics += 'BEGIN:VEVENT\n';
    ics += `UID:${t.id}@gantt\n`;
    ics += `DTSTART:${t.start_date.replace(/-/g, '')}\n`;
    ics += `DTEND:${t.end_date.replace(/-/g, '')}\n`;
    ics += `SUMMARY:${t.name}\n`;
    if (t.description) ics += `DESCRIPTION:${t.description}\n`;
    if (t.assignee) ics += `ORGANIZER;CN=${t.assignee}\n`;
    ics += `STATUS:${t.progress === 100 ? 'COMPLETED' : 'TENTATIVE'}\n`;
    ics += 'END:VEVENT\n';
  });
  ics += 'END:VCALENDAR';
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'plan.ics'; a.click();
  URL.revokeObjectURL(url);
}
