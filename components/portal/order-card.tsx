'use client';

import Link from 'next/link';
import { ArrowRight, Calendar } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/card';
import { StatusPill } from '@/components/portal/status-pill';
import { fmt, getTotalPaid, jobGrandTotal } from '@/lib/domain/totals';
import type { Job } from '@/types/db';

function formatDeliveryDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function OrderCard({ job }: { job: Job }) {
  const total = jobGrandTotal(job);
  const paid = getTotalPaid(job);
  const balance = Math.max(total - paid, 0);
  const itemCount = job.items.length;
  const summary = itemCount
    ? job.items
        .map((it) => it.category || it.description)
        .filter(Boolean)
        .slice(0, 2)
        .join(' · ')
    : 'No items';

  return (
    <Link href={`/portal/orders/${job.id}`} className="group block">
      <Card hoverLift className="h-full">
        <CardBody className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="font-mono text-xs text-muted-foreground">#{job.jobNo}</div>
              <h3 className="mt-1 font-body font-semibold text-lg tracking-tight truncate">
                {summary}
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </p>
            </div>
            <StatusPill status={job.jobStatus} />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Delivery</div>
              <div className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                <Calendar size={14} className="text-muted-foreground" />
                {formatDeliveryDate(job.deliveryDate)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Balance</div>
              <div
                className={
                  'mt-1 font-body font-semibold text-sm ' +
                  (balance > 0 ? 'text-amber-700' : 'text-emerald-700')
                }
              >
                {balance > 0 ? fmt(balance) : 'Paid in full'}
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total {fmt(total)}</span>
            <ArrowRight size={16} className="text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
