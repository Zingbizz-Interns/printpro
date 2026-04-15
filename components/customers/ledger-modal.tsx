'use client';

import Link from 'next/link';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { fmt, jobGrandTotal } from '@/lib/domain/totals';
import { fmtShortDate } from '@/lib/kanban/date-utils';
import { statusTheme } from '@/lib/kanban/status-theme';
import type { Job } from '@/types/db';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  companyName: string;
  jobs: Job[];
  isOwner: boolean;
}

export function LedgerModal({ open, onOpenChange, companyName, jobs, isOwner }: Props) {
  const totalBilled = jobs.reduce((s, j) => s + jobGrandTotal(j), 0);
  const totalDue = jobs.reduce((s, j) => {
    if (j.paymentStatus === 'Fully Paid') return s;
    return s + jobGrandTotal(j) - (Number(j.advancePaid) || 0);
  }, 0);
  const totalPaid = totalBilled - totalDue;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={<>📒 {companyName}</>}
      description={`${jobs.length} order${jobs.length === 1 ? '' : 's'} on file`}
      size="xl"
      tilt="l"
    >
      {isOwner ? (
        <div className="grid grid-cols-3 gap-3">
          <Tile label="Total billed" value={fmt(totalBilled)} tone="ink" />
          <Tile label="Total paid" value={fmt(totalPaid)} tone="leaf" />
          <Tile
            label="Outstanding"
            value={fmt(totalDue)}
            tone={totalDue > 0.01 ? 'accent' : 'leaf'}
          />
        </div>
      ) : (
        <div className="bg-amber-lt border-2 border-amber-sketch wobbly-sm px-3 py-2 text-amber-sketch text-sm font-bold">
          🔒 Financial totals visible to admin only
        </div>
      )}

      {jobs.length === 0 ? (
        <p className="text-pencil/60 italic text-center py-6">No orders for this customer yet.</p>
      ) : (
        <div className="hd-table">
          <table className="w-full text-left font-body text-sm">
            <thead className="bg-pencil text-white font-display">
              <tr>
                <th className="px-3 py-2">Job #</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Items</th>
                <th className="px-3 py-2">Status</th>
                {isOwner && <th className="px-3 py-2 text-right">Total</th>}
                {isOwner && <th className="px-3 py-2 text-right">Balance</th>}
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => {
                const gt = jobGrandTotal(j);
                const bal = gt - (Number(j.advancePaid) || 0);
                const t = statusTheme(j.jobStatus);
                return (
                  <tr key={String(j.id)} className="border-t border-dashed border-pencil/30 hover:bg-postit/40">
                    <td className="px-3 py-2 font-mono font-bold">#{j.jobNo}</td>
                    <td className="px-3 py-2">{fmtShortDate(j.orderDate)}</td>
                    <td className="px-3 py-2 text-pencil/70">{j.items.length}</td>
                    <td className="px-3 py-2">
                      <Badge
                        tone="paper"
                        className="text-xs border-2"
                        style={{ background: t.tint, color: t.ink, borderColor: t.ink }}
                      >
                        {t.mark} {t.label}
                      </Badge>
                    </td>
                    {isOwner && (
                      <td className="px-3 py-2 text-right font-mono">{fmt(gt)}</td>
                    )}
                    {isOwner && (
                      <td
                        className={`px-3 py-2 text-right font-mono font-bold ${bal > 0.01 ? 'text-accent' : 'text-leaf'}`}
                      >
                        {fmt(Math.max(0, bal))}
                      </td>
                    )}
                    <td className="px-3 py-2">
                      <Link
                        href={`/jobs/${j.id}`}
                        onClick={() => onOpenChange(false)}
                        className="kb-action wobbly-sm kb-action-neutral"
                      >
                        open →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'ink' | 'leaf' | 'accent';
}) {
  const cls = {
    ink: 'bg-ink-lt text-ink',
    leaf: 'bg-leaf-lt text-leaf',
    accent: 'bg-accent-lt text-accent',
  }[tone];
  return (
    <div className={`${cls} border-2 border-pencil wobbly-sm px-3 py-2 shadow-hand-soft`}>
      <div className="text-xs font-display uppercase tracking-wide opacity-70">{label}</div>
      <div className="font-mono font-bold text-xl mt-0.5">{value}</div>
    </div>
  );
}
