'use client';

import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { STATUS_THEME, ALL_STATUSES } from '@/lib/kanban/status-theme';
import { fmt } from '@/lib/domain/totals';
import type { Job, JobStatus, PaymentStatus } from '@/types/db';
import { cn } from '@/lib/utils';

interface Props {
  draft: Job;
  subtotal: number;
  grandTotal: number;
  totalPaid: number;
  balance: number;
  derivedJobStatus: JobStatus;
  derivedPaymentStatus: PaymentStatus;
  onUpdate: (patch: Partial<Job>) => void;
  onChangeJobStatus: (status: JobStatus) => void;
}

export function TotalsPanel({
  draft,
  subtotal,
  grandTotal,
  totalPaid,
  balance,
  derivedJobStatus,
  derivedPaymentStatus,
  onUpdate,
  onChangeJobStatus,
}: Props) {
  const theme = STATUS_THEME[derivedJobStatus];
  const discAmt = subtotal * ((draft.discountPct || 0) / 100);
  const afterDisc = subtotal - discAmt;
  const gstAmt = draft.gstEnabled ? afterDisc * 0.18 : 0;
  const beforeRound = afterDisc + gstAmt;
  const roundDiff = grandTotal - beforeRound;

  return (
    <Card className="border border-border shadow-md rounded-3xl sticky top-24 bg-card z-10 p-0 overflow-hidden">
      <CardHeader className="px-8 pt-8 pb-4">
        <CardTitle className="text-2xl font-body font-bold text-foreground">Totals</CardTitle>
      </CardHeader>
      <CardBody className="space-y-6 px-8 pb-8">
        {/* GST + Discount toggles */}
        <div className="flex flex-wrap gap-3">
          <ToggleChip
            active={draft.gstEnabled}
            onClick={() => onUpdate({ gstEnabled: !draft.gstEnabled })}
            label="GST 18%"
          />
          <DiscountToggle
            value={draft.discountPct || 0}
            onChange={(pct) => onUpdate({ discountPct: pct })}
          />
        </div>

        {/* Line items */}
        <div className="space-y-2.5 font-mono text-base">
          <Line label="Subtotal" value={fmt(subtotal)} />
          {draft.discountPct > 0 && (
            <Line
              label={`Discount (${draft.discountPct}%)`}
              value={`−${fmt(discAmt)}`}
              tone="amber"
            />
          )}
          {draft.gstEnabled && <Line label="GST 18%" value={`+${fmt(gstAmt)}`} tone="ink" />}
          {Math.abs(roundDiff) > 0.005 && (
            <Line
              label="Round off"
              value={`${roundDiff >= 0 ? '+' : '−'}${fmt(Math.abs(roundDiff))}`}
              tone="muted"
            />
          )}
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex items-baseline justify-between">
            <span className="font-body font-semibold text-lg text-muted-foreground uppercase tracking-widest">Grand Total</span>
            <span className="font-mono font-bold text-3xl text-foreground">{fmt(grandTotal)}</span>
          </div>
        </div>

        {totalPaid > 0 && (
          <div className="space-y-2 pt-3 border-t border-dashed border-border">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground font-medium uppercase tracking-widest text-[11px]">Paid</span>
              <span className="font-mono text-emerald-600 font-bold">{fmt(totalPaid)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-body font-semibold text-muted-foreground uppercase tracking-widest text-sm">Balance Due</span>
              <span
                className={cn(
                  'font-mono font-bold text-2xl',
                  balance > 0.01 ? 'text-red-500' : 'text-emerald-500',
                )}
              >
                {fmt(Math.max(0, balance))}
              </span>
            </div>
          </div>
        )}

        {/* Auto-derived statuses */}
        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between gap-2 bg-muted/30 px-3 py-2 rounded-xl">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Job Status</span>
            <div className="relative">
              <select
                value={derivedJobStatus}
                onChange={(e) => onChangeJobStatus(e.target.value as JobStatus)}
                aria-label="Job status"
                className="appearance-none text-[10px] sm:text-xs font-semibold rounded-md border shadow-sm pl-2.5 pr-7 py-1 min-h-[28px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                style={{
                  background: theme.tint,
                  color: theme.ink,
                  borderColor: theme.ink,
                }}
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-card text-foreground">
                    {STATUS_THEME[s].mark} {STATUS_THEME[s].label}
                  </option>
                ))}
              </select>
              <span
                aria-hidden
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono"
                style={{ color: theme.ink }}
              >
                ▾
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 bg-muted/30 px-3 py-2 rounded-xl">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Payment</span>
            <Badge
              tone={
                derivedPaymentStatus === 'Fully Paid'
                  ? 'leaf'
                  : derivedPaymentStatus === 'Advance Paid'
                  ? 'amber'
                  : 'accent'
              }
              className="rounded-md"
            >
              {derivedPaymentStatus === 'Fully Paid'
                ? '✓ Fully Paid'
                : derivedPaymentStatus === 'Advance Paid'
                ? '⬡ Advance Paid'
                : '● Unpaid'}
              <span className="ml-1 opacity-50 font-mono text-[9px] uppercase">Auto</span>
            </Badge>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function Line({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'amber' | 'ink' | 'muted';
}) {
  const color = tone === 'amber' ? 'text-amber-500' : tone === 'ink' ? 'text-blue-500' : tone === 'muted' ? 'text-muted-foreground' : 'text-foreground';
  return (
    <div className={cn('flex items-baseline justify-between', color)}>
      <span className="font-medium text-sm">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function ToggleChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-4 py-2 text-sm font-semibold rounded-xl border transition-all shadow-sm',
        active
          ? 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-inset ring-blue-500/10'
          : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground hover:border-muted-foreground/30',
      )}
    >
      <div className="flex items-center gap-1.5">
        {active && <span className="text-blue-500">✓</span>}
        <span>{label}</span>
      </div>
    </button>
  );
}

function DiscountToggle({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const active = value > 0;
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-xl border transition-all shadow-sm',
        active
          ? 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-inset ring-amber-500/10'
          : 'bg-card text-muted-foreground border-border hover:border-muted-foreground/30',
      )}
    >
      <button
        type="button"
        onClick={() => onChange(active ? 0 : 10)}
        className="flex items-center gap-1.5 hover:text-foreground transition-colors"
      >
        {active && <span className="text-amber-500">✓</span>}
        <span>🏷 Discount</span>
      </button>
      {active && (
        <div className="flex items-center gap-1 border-l border-amber-200/50 pl-2 ml-1">
          <Input
            type="number"
            value={value}
            onChange={(e) => onChange(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
            className="w-[72px] !py-0.5 !px-2.5 text-sm font-mono h-8"
            min={0}
            max={100}
            step={0.5}
          />
          <span className="font-mono">%</span>
        </div>
      )}
    </div>
  );
}
