/** Days between `due` (YYYY-MM-DD) and today. Negative = overdue. */
export function daysUntilDue(due: string | null | undefined): number | null {
  if (!due) return null;
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (24 * 3600 * 1000));
}

export function isOverdueDate(due: string | null | undefined): boolean {
  const n = daysUntilDue(due);
  return n !== null && n < 0;
}
export function isDueToday(due: string | null | undefined): boolean {
  return daysUntilDue(due) === 0;
}
export function isDueTomorrow(due: string | null | undefined): boolean {
  return daysUntilDue(due) === 1;
}

/** Short relative label: "Today", "Tomorrow", "15 Apr", "3d overdue". */
export function deliveryLabel(due: string | null | undefined): string {
  const n = daysUntilDue(due);
  if (n === null) return '—';
  if (n < 0) return `${Math.abs(n)}d overdue`;
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  return fmtShortDate(due!);
}

export function fmtShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
