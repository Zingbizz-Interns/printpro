import type { Job, JobStatus, PaymentStatus } from '@/types/db';
import { STATUS_THEME } from './status-theme';
import { daysUntilDue, isDueToday, isOverdueDate } from './date-utils';
import { jobGrandTotal } from '@/lib/domain/totals';

export type ViewTab = 'current' | 'completed';

export interface KanbanFilters {
  tab: ViewTab;
  search: string;
  overdue: boolean;
  gstOnly: boolean;
  dueToday: boolean;
  paymentStatus: PaymentStatus | '';
  jobStatus: JobStatus | '';
}

export const INITIAL_FILTERS: KanbanFilters = {
  tab: 'current',
  search: '',
  overdue: false,
  gstOnly: false,
  dueToday: false,
  paymentStatus: '',
  jobStatus: '',
};

export function filterJobs(jobs: Job[], f: KanbanFilters): Job[] {
  const q = f.search.trim().toLowerCase();
  return jobs.filter((j) => {
    // tab
    const delivered = j.jobStatus === 'Delivered';
    if (f.tab === 'current' && delivered) return false;
    if (f.tab === 'completed' && !delivered) return false;

    // search
    if (q) {
      const hay = [
        `#${j.jobNo}`,
        j.companyName,
        j.contactPerson,
        j.contactNumber,
        j.gstNo,
        j.specialNotes,
        ...j.items.map((i) => `${i.category} ${i.description}`),
      ]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }

    // pills
    if (f.overdue && !isOverdueDate(j.deliveryDate)) return false;
    if (f.dueToday && !isDueToday(j.deliveryDate)) return false;
    if (f.gstOnly && !j.gstEnabled) return false;

    // dropdowns
    if (f.paymentStatus && j.paymentStatus !== f.paymentStatus) return false;
    if (f.jobStatus && j.jobStatus !== f.jobStatus) return false;

    return true;
  });
}

/**
 * Smart sort — urgency first:
 *   1. On Hold jobs bubble to top (need attention)
 *   2. Overdue jobs (further overdue = higher)
 *   3. Due today → due tomorrow → future → no date
 *   4. Delivered/completed to the end
 *   5. Tie-break by job number desc (newer first)
 */
export function smartSort(jobs: Job[]): Job[] {
  return jobs.slice().sort((a, b) => rank(a) - rank(b) || b.jobNo - a.jobNo);
}

function rank(j: Job): number {
  if (j.jobStatus === 'Delivered') return 9_000_000 + (daysUntilDue(j.deliveryDate) ?? 0);
  if (j.jobStatus === 'On Hold') return -1_000_000;

  const d = daysUntilDue(j.deliveryDate);
  if (d === null) return 500_000; // no date — mid
  if (d < 0) return -500_000 + d; // more overdue → lower rank
  return d * 100; // sooner due → lower rank
}

export interface BoardStats {
  total: number;
  active: number;
  completed: number;
  overdue: number;
  dueToday: number;
  unpaid: number;
  gst: number;
  outstanding: number;
}

export function computeStats(all: Job[]): BoardStats {
  let outstanding = 0;
  let overdue = 0;
  let dueToday = 0;
  let unpaid = 0;
  let gst = 0;
  let active = 0;
  let completed = 0;

  for (const j of all) {
    if (j.jobStatus === 'Delivered') completed++;
    else active++;

    if (isOverdueDate(j.deliveryDate) && j.jobStatus !== 'Delivered') overdue++;
    if (isDueToday(j.deliveryDate) && j.jobStatus !== 'Delivered') dueToday++;
    if (j.gstEnabled) gst++;

    if (j.paymentStatus !== 'Fully Paid') {
      unpaid++;
      outstanding += jobGrandTotal(j) - (Number(j.advancePaid) || 0);
    }
  }

  return {
    total: all.length,
    active,
    completed,
    overdue,
    dueToday,
    unpaid,
    gst,
    outstanding,
  };
}

export const STATUS_LIST = Object.keys(STATUS_THEME) as JobStatus[];
