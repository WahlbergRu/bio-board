import client from './client';

export async function uploadExcel(
  file: File,
): Promise<{ count: number }> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await client.post<{ count: number }>(
    '/excel/upload',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

export async function exportExcel(): Promise<void> {
  const { data } = await client.get('/excel/export', {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gantt_plan.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}
