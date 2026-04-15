'use client';

import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { STATUS_THEME } from '@/lib/kanban/status-theme';
import { fmt, itemsSubtotal } from '@/lib/domain/totals';
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
}: Props) {
  const discAmt = subtotal * ((draft.discountPct || 0) / 100);
  const afterDisc = subtotal - discAmt;
  const gstAmt = draft.gstEnabled ? afterDisc * 0.18 : 0;
  const beforeRound = afterDisc + gstAmt;
  const roundDiff = grandTotal - beforeRound;

  return (
    <Card tone="paper" wobbly="md" decoration="tape" className="sticky top-20">
      <CardHeader>
        <CardTitle className="text-2xl">Totals</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
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
        <div className="space-y-1 font-mono text-base">
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

        <div className="border-t-2 border-dashed border-pencil/40 pt-3">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-xl">Grand total</span>
            <span className="font-mono font-bold text-2xl">{fmt(grandTotal)}</span>
          </div>
        </div>

        {totalPaid > 0 && (
          <div className="space-y-1 pt-1 border-t border-dashed border-pencil/30">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-pencil/70">Paid</span>
              <span className="font-mono text-leaf font-bold">{fmt(totalPaid)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-display">Balance due</span>
              <span
                className={cn(
                  'font-mono font-bold text-xl',
                  balance > 0.01 ? 'text-accent' : 'text-leaf',
                )}
              >
                {fmt(Math.max(0, balance))}
              </span>
            </div>
          </div>
        )}

        {/* Auto-derived statuses */}
        <div className="pt-3 border-t-2 border-dashed border-pencil/30 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-pencil/60">Job status</span>
            <Badge
              tone="paper"
              className="text-xs border-2"
              style={{
                background: STATUS_THEME[derivedJobStatus].tint,
                color: STATUS_THEME[derivedJobStatus].ink,
                borderColor: STATUS_THEME[derivedJobStatus].ink,
              }}
            >
              {STATUS_THEME[derivedJobStatus].mark} {STATUS_THEME[derivedJobStatus].label}
              <span className="ml-1 opacity-50">auto</span>
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-pencil/60">Payment</span>
            <Badge
              tone={
                derivedPaymentStatus === 'Fully Paid'
                  ? 'leaf'
                  : derivedPaymentStatus === 'Advance Paid'
                  ? 'amber'
                  : 'accent'
              }
            >
              {derivedPaymentStatus === 'Fully Paid'
                ? '✓ Fully Paid'
                : derivedPaymentStatus === 'Advance Paid'
                ? '⬡ Advance Paid'
                : '● Unpaid'}
              <span className="ml-1 opacity-50">auto</span>
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
  const color = tone === 'amber' ? 'text-amber-sketch' : tone === 'ink' ? 'text-ink' : tone === 'muted' ? 'text-pencil/60' : 'text-pencil';
  return (
    <div className={cn('flex items-baseline justify-between', color)}>
      <span>{label}</span>
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
        'px-3 py-1.5 text-sm font-bold border-2 wobbly-sm transition-all',
        active
          ? 'bg-ink-lt text-ink border-ink shadow-hand-sm'
          : 'bg-white text-pencil/60 border-dashed border-pencil/40 hover:border-solid',
      )}
    >
      {active && '✓ '}
      {label}
    </button>
  );
}

function DiscountToggle({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const active = value > 0;
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 text-sm font-bold border-2 wobbly-sm transition-all',
        active
          ? 'bg-amber-lt text-amber-sketch border-amber-sketch shadow-hand-sm'
          : 'bg-white text-pencil/60 border-dashed border-pencil/40',
      )}
    >
      <button
        type="button"
        onClick={() => onChange(active ? 0 : 10)}
        className="flex items-center gap-1"
      >
        {active && '✓ '}🏷 Discount
      </button>
      {active && (
        <>
          <Input
            type="number"
            value={value}
            onChange={(e) => onChange(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
            className="!w-16 !py-0.5 !px-2 !text-sm"
            min={0}
            max={100}
            step={0.5}
          />
          <span>%</span>
        </>
      )}
    </div>
  );
}
