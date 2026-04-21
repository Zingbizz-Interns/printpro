'use client';

import Link from 'next/link';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { fmt, jobGrandTotal } from '@/lib/domain/totals';
import { fmtShortDate } from '@/lib/kanban/date-utils';
import { statusTheme } from '@/lib/kanban/status-theme';
import type { Job } from '@/types/db';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

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
      title={<span className="font-body font-bold text-3xl text-foreground tracking-tight">{companyName}</span>}
      description={
        <span className="font-medium text-muted-foreground bg-muted/50 px-2.5 py-0.5 rounded-md border border-border mt-1 inline-block">
          {jobs.length} order{jobs.length === 1 ? '' : 's'} on file
        </span>
      }
      size="2xl"
    >
      <div className="space-y-8 mt-2">
        {isOwner ? (
          <div className="grid grid-cols-3 gap-6">
            <Tile label="Total Billed" value={fmt(totalBilled)} tone="ink" />
            <Tile label="Total Paid" value={fmt(totalPaid)} tone="leaf" />
            <Tile
              label="Outstanding"
              value={fmt(totalDue)}
              tone={totalDue > 0.01 ? 'accent' : 'leaf'}
            />
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-sm font-semibold flex items-center shadow-sm">
            🔒 Financial totals visible to admin only
          </div>
        )}

        {jobs.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-border">
            <p className="text-muted-foreground font-medium">No orders for this customer yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden border border-border rounded-2xl shadow-sm bg-card">
            <table className="w-full text-left font-body text-sm whitespace-nowrap">
              <thead className="bg-muted text-muted-foreground font-semibold uppercase tracking-wider text-[10px] border-b border-border">
                <tr>
                  <th className="px-5 py-3">Job #</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-center">Items</th>
                  <th className="px-5 py-3">Status</th>
                  {isOwner && <th className="px-5 py-3 text-right">Total</th>}
                  {isOwner && <th className="px-5 py-3 text-right">Balance</th>}
                  <th className="px-5 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {jobs.map((j) => {
                  const gt = jobGrandTotal(j);
                  const bal = gt - (Number(j.advancePaid) || 0);
                  const t = statusTheme(j.jobStatus);
                  return (
                    <tr key={String(j.id)} className="hover:bg-muted/40 transition-colors group">
                      <td className="px-5 py-3.5 font-mono font-bold text-foreground">#{j.jobNo}</td>
                      <td className="px-5 py-3.5 text-muted-foreground font-medium">{fmtShortDate(j.orderDate)}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="bg-muted px-2 py-0.5 rounded-md font-mono text-xs">{j.items.length}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          className="text-[10px] font-semibold border px-2 py-0.5 rounded-md shadow-sm"
                          style={{ background: t.tint, color: t.ink, borderColor: t.ink }}
                        >
                          {t.mark} {t.label}
                        </Badge>
                      </td>
                      {isOwner && (
                        <td className="px-5 py-3.5 text-right font-mono font-medium text-foreground">{fmt(gt)}</td>
                      )}
                      {isOwner && (
                        <td
                          className={`px-5 py-3.5 text-right font-mono font-bold ${bal > 0.01 ? 'text-red-500' : 'text-emerald-500'}`}
                        >
                          {fmt(Math.max(0, bal))}
                        </td>
                       )}
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/jobs/${j.id}`}
                          onClick={() => onOpenChange(false)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all bg-muted hover:bg-border px-2 py-1 rounded-md"
                        >
                          Open <ArrowRight size={12} strokeWidth={2.5} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
    ink: 'bg-blue-50 text-blue-700 border-blue-100',
    leaf: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    accent: 'bg-red-50 text-red-700 border-red-100',
  }[tone];
  
  return (
    <div className={cn(cls, 'border rounded-2xl p-5 shadow-sm')}>
      <div className="text-[11px] font-semibold uppercase tracking-widest opacity-80">{label}</div>
      <div className="font-mono font-bold text-3xl mt-2">{value}</div>
    </div>
  );
}
