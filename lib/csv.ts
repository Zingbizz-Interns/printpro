import Papa from 'papaparse';

/**
 * Trigger a CSV download in the browser. Prepends a BOM so Excel
 * picks up UTF-8 correctly (matches reference app behavior).
 */
export function downloadCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns?: readonly (keyof T & string)[],
): void {
  const csv = Papa.unparse(rows, columns ? { columns: [...columns] } : undefined);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
