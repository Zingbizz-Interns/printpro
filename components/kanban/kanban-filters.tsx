'use client';

import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ALL_STATUSES, STATUS_THEME } from '@/lib/kanban/status-theme';
import type { JobStatus, PaymentStatus } from '@/types/db';
import type { KanbanFilters } from '@/lib/kanban/filtering';

interface Props {
  filters: KanbanFilters;
  onChange: (patch: Partial<KanbanFilters>) => void;
  onReset: () => void;
  visibleCount: number;
  totalCount: number;
}

const PAY_OPTIONS: { v: PaymentStatus | ''; l: string }[] = [
  { v: '', l: 'any payment' },
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
          strokeWidth={2.5}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-pencil/50 pointer-events-none"
        />
        <input
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="search by job #, customer, notes…"
          className="w-full pl-9 pr-9 py-2 text-base border-2 border-pencil wobbly-sm bg-white placeholder:text-pencil/40 placeholder:italic focus:border-ink focus:ring-2 focus:ring-ink/20"
        />
        {filters.search && (
          <button
            onClick={() => onChange({ search: '' })}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-pencil/50 hover:text-accent"
          >
            <X size={14} strokeWidth={2.5} />
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
        className="border-2 border-pencil wobbly-sm bg-white px-3 py-2 text-sm font-body focus:border-ink"
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
        className="border-2 border-pencil wobbly-sm bg-white px-3 py-2 text-sm font-body focus:border-ink"
      >
        <option value="">any status</option>
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_THEME[s].mark} {STATUS_THEME[s].label}
          </option>
        ))}
      </select>

      {anyActive && (
        <button
          onClick={onReset}
          className="text-sm text-accent font-bold underline decoration-dashed underline-offset-4 hover:decoration-solid"
        >
          clear filters
        </button>
      )}

      <div className="flex-1" />

      <span className="text-sm text-pencil/60 italic font-mono">
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
    accent: 'bg-accent-lt text-accent border-accent',
    amber: 'bg-amber-lt text-amber-sketch border-amber-sketch',
    ink: 'bg-ink-lt text-ink border-ink',
  }[tone];
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 text-sm font-bold border-2 wobbly-sm transition-all whitespace-nowrap',
        active
          ? `${activeCls} shadow-hand-sm`
          : 'bg-white text-pencil/70 border-pencil/40 border-dashed hover:border-solid hover:text-pencil',
      )}
    >
      {children}
    </button>
  );
}
