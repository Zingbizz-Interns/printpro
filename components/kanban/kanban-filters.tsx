'use client';

import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ALL_STATUSES, STATUS_THEME } from '@/lib/kanban/status-theme';
import type { JobStatus, PaymentStatus } from '@/types/db';
import type { KanbanFilters as KFType } from '@/lib/kanban/filtering';

interface Props {
  filters: KFType;
  onChange: (patch: Partial<KFType>) => void;
  onReset: () => void;
  visibleCount: number;
  totalCount: number;
}

const PAY_OPTIONS: { v: PaymentStatus | ''; l: string }[] = [
  { v: '', l: 'Any Payment' },
  { v: 'Unpaid', l: '● Unpaid' },
  { v: 'Advance Paid', l: '⬡ Advance Paid' },
  { v: 'Fully Paid', l: '✓ Fully Paid' },
];

export function KanbanFilters({ filters, onChange, onReset, visibleCount, totalCount }: Props) {
  const anyActive =
    filters.search ||
    filters.overdue ||
    filters.gstOnly ||
    filters.dueToday ||
    filters.paymentStatus ||
    filters.jobStatus;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[220px] max-w-md">
        <Search
          size={16}
          strokeWidth={2}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Search by job #, customer, notes…"
          className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-border bg-card placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all shadow-sm"
        />
        {filters.search && (
          <button
            onClick={() => onChange({ search: '' })}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground bg-muted p-1 rounded-full"
          >
            <X size={12} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Pill filters */}
      <Pill
        active={filters.overdue}
        tone="accent"
        onClick={() => onChange({ overdue: !filters.overdue })}
      >
        ⚠ Overdue
      </Pill>
      <Pill
        active={filters.dueToday}
        tone="amber"
        onClick={() => onChange({ dueToday: !filters.dueToday })}
      >
        📅 Due Today
      </Pill>
      <Pill
        active={filters.gstOnly}
        tone="ink"
        onClick={() => onChange({ gstOnly: !filters.gstOnly })}
      >
        🧾 GST
      </Pill>

      {/* Payment dropdown */}
      <select
        value={filters.paymentStatus}
        onChange={(e) => onChange({ paymentStatus: e.target.value as PaymentStatus | '' })}
        className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-ring focus:outline-none shadow-sm cursor-pointer"
      >
        {PAY_OPTIONS.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>

      {/* Status dropdown */}
      <select
        value={filters.jobStatus}
        onChange={(e) => onChange({ jobStatus: e.target.value as JobStatus | '' })}
        className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-ring focus:outline-none shadow-sm cursor-pointer"
      >
        <option value="">Any Status</option>
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_THEME[s].mark} {STATUS_THEME[s].label}
          </option>
        ))}
      </select>

      {anyActive && (
        <button
          onClick={onReset}
          className="text-sm font-medium text-accent hover:underline decoration-offset-4"
        >
          Clear filters
        </button>
      )}

      <div className="flex-1" />

      <span className="text-sm text-muted-foreground font-medium bg-muted px-3 py-1 rounded-full">
        {visibleCount === totalCount
          ? `${totalCount} jobs`
          : `${visibleCount} of ${totalCount}`}
      </span>
    </div>
  );
}

function Pill({
  active,
  tone,
  onClick,
  children,
}: {
  active: boolean;
  tone: 'accent' | 'amber' | 'ink';
  onClick: () => void;
  children: React.ReactNode;
}) {
  const activeCls = {
    accent: 'bg-red-50 text-red-600 border-red-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    ink: 'bg-blue-50 text-blue-600 border-blue-200',
  }[tone];
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 text-sm font-semibold rounded-xl border transition-all whitespace-nowrap shadow-sm',
        active
          ? `${activeCls} ring-1 ring-inset ring-[var(--color-ring)] ring-opacity-20`
          : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
