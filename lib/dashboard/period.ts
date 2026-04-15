export type Period = 'today' | 'week' | 'month' | 'lastmonth' | 'year' | 'all';

export const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today',
  week: 'This week',
  month: 'This month',
  lastmonth: 'Last month',
  year: 'This year',
  all: 'All time',
};

export const PERIODS: Period[] = ['today', 'week', 'month', 'lastmonth', 'year', 'all'];

export interface DateRange {
  from: string | null; // YYYY-MM-DD inclusive
  to: string | null; // YYYY-MM-DD inclusive
}

export function periodRange(p: Period): DateRange {
  const now = new Date();
  const today = isoDate(now);

  switch (p) {
    case 'today':
      return { from: today, to: today };
    case 'week': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return { from: isoDate(d), to: today };
    }
    case 'month':
      return {
        from: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`,
        to: today,
      };
    case 'lastmonth': {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: isoDate(lm), to: isoDate(lmEnd) };
    }
    case 'year':
      return { from: `${now.getFullYear()}-01-01`, to: today };
    case 'all':
    default:
      return { from: null, to: null };
  }
}

export function inRange(dateStr: string | null | undefined, range: DateRange): boolean {
  if (!dateStr) return range.from === null && range.to === null;
  if (range.from && dateStr < range.from) return false;
  if (range.to && dateStr > range.to) return false;
  return true;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
