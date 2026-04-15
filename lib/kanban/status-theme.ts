import type { JobStatus } from '@/types/db';

export interface StatusTheme {
  /** Short label shown on cards. */
  label: string;
  /** Left accent-bar colour on the card (use as CSS `background`). */
  accent: string;
  /** Tint for the status badge background. */
  tint: string;
  /** Text colour that pairs with the tint. */
  ink: string;
  /** Emoji or mark. */
  mark: string;
  /** Sort priority: urgent statuses come first. */
  priority: number;
}

export const STATUS_THEME: Record<JobStatus, StatusTheme> = {
  'On Hold': {
    label: 'On Hold',
    accent: '#ff4d4d',
    tint: '#ffe5e5',
    ink: '#dc2626',
    mark: '⏸',
    priority: 0,
  },
  'Design - Not yet Started': {
    label: 'Not Started',
    accent: '#94a3b8',
    tint: '#e5e0d8',
    ink: '#475569',
    mark: '○',
    priority: 1,
  },
  'Design - In Progress': {
    label: 'Designing',
    accent: '#2d5da1',
    tint: '#dbe7f7',
    ink: '#2d5da1',
    mark: '✎',
    priority: 2,
  },
  'Design - Approved': {
    label: 'Approved',
    accent: '#7c3aed',
    tint: '#ede9fe',
    ink: '#6d28d9',
    mark: '✓',
    priority: 3,
  },
  'In Printing': {
    label: 'Printing',
    accent: '#d97706',
    tint: '#fde68a',
    ink: '#b45309',
    mark: '🖨',
    priority: 4,
  },
  'In Finishing': {
    label: 'Finishing',
    accent: '#ea580c',
    tint: '#ffedd5',
    ink: '#c2410c',
    mark: '✂',
    priority: 5,
  },
  'Ready for Delivery': {
    label: 'Ready',
    accent: '#fcd34d',
    tint: '#fff9c4',
    ink: '#92400e',
    mark: '📦',
    priority: 6,
  },
  Delivered: {
    label: 'Delivered',
    accent: '#4a7c59',
    tint: '#d9e9df',
    ink: '#4a7c59',
    mark: '✅',
    priority: 7,
  },
};

export const ALL_STATUSES: JobStatus[] = [
  'Design - Not yet Started',
  'Design - In Progress',
  'Design - Approved',
  'In Printing',
  'In Finishing',
  'Ready for Delivery',
  'Delivered',
  'On Hold',
];

/**
 * Safe accessor — returns the `Not yet Started` theme if the given string
 * isn't a known status (e.g. legacy row from an older schema, or a typo
 * that snuck past the app layer). Prevents the kanban from crashing on
 * a single unexpected DB value.
 */
export function statusTheme(s: string | null | undefined): StatusTheme {
  if (s && s in STATUS_THEME) return STATUS_THEME[s as JobStatus];
  return STATUS_THEME['Design - Not yet Started'];
}
