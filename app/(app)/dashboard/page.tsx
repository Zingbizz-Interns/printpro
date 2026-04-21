'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth/store';
import { listJobs } from '@/lib/db/jobs';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fmt, jobGrandTotal } from '@/lib/domain/totals';
import { fmtShortDate, isOverdueDate, isDueToday } from '@/lib/kanban/date-utils';
import { statusTheme } from '@/lib/kanban/status-theme';
import {
  PERIODS,
  PERIOD_LABELS,
  inRange,
  periodRange,
  type Period,
} from '@/lib/dashboard/period';
import { cn } from '@/lib/utils';
import type { Job, PaymentStatus } from '@/types/db';

const PAY_FILTERS: { v: PaymentStatus | ''; l: string }[] = [
  { v: '', l: 'All' },
  { v: 'Unpaid', l: '● Unpaid' },
  { v: 'Advance Paid', l: '⬡ Advance' },
  { v: 'Fully Paid', l: '✓ Paid' },
];

export default function DashboardPage() {
  const router = useRouter();
  const isOwner = useAuthStore((s) => s.isOwner());

  useEffect(() => {
    if (!isOwner) router.replace('/kanban');
  }, [isOwner, router]);

  const jobsQ = useQuery({ queryKey: ['jobs'], queryFn: listJobs });

  const [period, setPeriod] = useState<Period>('month');
  const [pay, setPay] = useState<PaymentStatus | ''>('');

  const range = useMemo(() => periodRange(period), [period]);

  const filtered = useMemo(() => {
    const all = jobsQ.data ?? [];
    return all.filter((j) => {
      if (!inRange(j.orderDate || null, range)) return false;
      if (pay && j.paymentStatus !== pay) return false;
      return true;
    });
  }, [jobsQ.data, range, pay]);

  const stats = useMemo(() => computeStats(filtered), [filtered]);

  const recent = useMemo(
    () => filtered.slice().sort((a, b) => b.jobNo - a.jobNo).slice(0, 8),
    [filtered],
  );
  const pending = useMemo(
    () =>
      filtered
        .filter((j) => j.paymentStatus !== 'Fully Paid')
        .map((j) => ({ job: j, balance: jobGrandTotal(j) - (Number(j.advancePaid) || 0) }))
        .filter((x) => x.balance > 0.01)
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 8),
    [filtered],
  );

  if (!isOwner) return null;

  return (
    <main className="px-4 sm:px-8 py-8 space-y-8 max-w-[1800px] mx-auto">
      {/* Title */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-body font-bold text-foreground tracking-tight">
            How's the shop doing?
          </h1>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="inline-flex items-center bg-muted/50 p-1 border border-border rounded-xl">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-4 py-2 text-sm font-semibold rounded-lg transition-all',
                period === p ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/80',
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {PAY_FILTERS.map((f) => (
            <button
              key={f.v}
              onClick={() => setPay(f.v)}
              className={cn(
                'px-4 py-2 text-sm font-semibold rounded-xl border transition-all shadow-sm',
                pay === f.v
                  ? 'bg-foreground text-white border-foreground ring-1 ring-inset ring-foreground/20'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground',
              )}
            >
              {f.l}
            </button>
          ))}
        </div>

        <div className="flex-1" />
        <span className="text-sm font-mono font-medium py-1.5 px-3 bg-muted text-muted-foreground rounded-lg border border-border">
          {filtered.length} job{filtered.length === 1 ? '' : 's'} in view
        </span>
      </div>

      {jobsQ.isError && (
        <div className="bg-red-50 border border-red-200 text-red-600 font-semibold px-6 py-4 rounded-xl shadow-sm text-center">
          Couldn't load jobs.
        </div>
      )}

      {/* Stat tiles — 8 of them */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Tile label="Orders" value={String(stats.orders)} tone="muted" />
        <Tile label="Revenue" value={fmt(stats.revenue)} tone="ink" />
        <Tile label="Collected" value={fmt(stats.collected)} tone="leaf" />
        <Tile
          label="Pending Due"
          value={fmt(stats.pending)}
          tone={stats.pending > 0 ? 'accent' : 'leaf'}
        />
        <Tile label="Today's Orders" value={String(stats.today)} tone="amber" />
        <Tile
          label="Overdue"
          value={String(stats.overdue)}
          tone={stats.overdue > 0 ? 'accent' : 'muted'}
        />
        <Tile label="GST Bills" value={String(stats.gstCount)} tone="ink" />
        <Tile label="GST Amount" value={fmt(stats.gstAmt)} tone="amber" />
      </div>

      {/* Two-column tables */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent orders */}
        <section>
          <h2 className="text-2xl font-body font-bold mb-4 flex items-center gap-3 text-foreground tracking-tight">
            Recent Orders
            <Badge tone="muted" className="text-xs font-semibold py-1">Last {recent.length}</Badge>
          </h2>
          {recent.length === 0 ? (
            <EmptyMini text="No orders in this range." />
          ) : (
            <div className="overflow-x-auto border border-border rounded-2xl shadow-sm bg-card">
              <table className="w-full text-left text-sm font-body whitespace-nowrap">
                <thead className="bg-muted text-muted-foreground font-semibold uppercase tracking-wider text-[10px] border-b border-border">
                  <tr>
                    <th className="px-5 py-3">#</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recent.map((j) => {
                    const t = statusTheme(j.jobStatus);
                    return (
                      <tr key={String(j.id)} className="hover:bg-muted/40 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-bold text-foreground">
                          <Link href={`/jobs/${j.id}`} className="hover:text-blue-600 transition-colors">
                            #{j.jobNo}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 font-medium truncate max-w-[220px] text-foreground" title={j.companyName}>
                          {j.companyName || <span className="text-muted-foreground italic">No Name</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge
                            className="text-[10px] font-semibold border px-2 py-0.5 rounded-md shadow-sm"
                            style={{ background: t.tint, color: t.ink, borderColor: t.ink }}
                          >
                            {t.mark} {t.label}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-foreground">
                          {fmt(jobGrandTotal(j))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Pending collections */}
        <section>
          <h2 className="text-2xl font-body font-bold mb-4 flex items-center gap-3 text-foreground tracking-tight">
            Pending Collections
            <Badge tone={pending.length > 0 ? 'accent' : 'leaf'} className="text-xs font-semibold py-1">
              {pending.length}
            </Badge>
          </h2>
          {pending.length === 0 ? (
            <EmptyMini text="Nothing outstanding." tone="leaf" />
          ) : (
            <div className="overflow-x-auto border border-border rounded-2xl shadow-sm bg-card">
              <table className="w-full text-left text-sm font-body whitespace-nowrap">
                <thead className="bg-muted text-muted-foreground font-semibold uppercase tracking-wider text-[10px] border-b border-border">
                  <tr>
                    <th className="px-5 py-3">#</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Due</th>
                    <th className="px-5 py-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pending.map(({ job: j, balance }) => (
                    <tr key={String(j.id)} className="hover:bg-muted/40 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-foreground">
                        <Link href={`/jobs/${j.id}`} className="hover:text-blue-600 transition-colors">
                          #{j.jobNo}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 font-medium truncate max-w-[220px] text-foreground" title={j.companyName}>
                        {j.companyName}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={cn(
                            'text-xs font-bold px-2 py-1 rounded border',
                            isOverdueDate(j.deliveryDate) ? 'bg-red-50 text-red-600 border-red-200' : 'bg-muted text-muted-foreground border-border',
                          )}
                        >
                          {j.deliveryDate ? fmtShortDate(j.deliveryDate) : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-red-500">{fmt(balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

interface Stats {
  orders: number;
  revenue: number;
  collected: number;
  pending: number;
  today: number;
  overdue: number;
  gstCount: number;
  gstAmt: number;
}

function computeStats(jobs: Job[]): Stats {
  let revenue = 0;
  let collected = 0;
  let pending = 0;
  let today = 0;
  let overdue = 0;
  let gstCount = 0;
  let gstAmt = 0;

  for (const j of jobs) {
    const gt = jobGrandTotal(j);
    revenue += gt;
    const adv = Number(j.advancePaid) || 0;
    if (j.paymentStatus === 'Fully Paid') {
      collected += gt;
    } else {
      collected += adv;
      pending += gt - adv;
    }
    if (isDueToday(j.orderDate)) today += 1;
    if (j.jobStatus !== 'Delivered' && isOverdueDate(j.deliveryDate)) overdue += 1;
    if (j.gstEnabled) {
      gstCount += 1;
      // GST is 18% of (subtotal − discount); back-derive from grand total
      const sub = j.items.reduce((s, it) => {
        const q = typeof it.quantity === 'number' ? it.quantity : parseFloat(String(it.quantity)) || 0;
        const r = typeof it.rate === 'number' ? it.rate : parseFloat(String(it.rate)) || 0;
        return s + q * r;
      }, 0);
      const afterDisc = sub * (1 - (Number(j.discountPct) || 0) / 100);
      gstAmt += afterDisc * 0.18;
    }
  }

  return {
    orders: jobs.length,
    revenue,
    collected,
    pending,
    today,
    overdue,
    gstCount,
    gstAmt,
  };
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'muted' | 'ink' | 'leaf' | 'accent' | 'amber';
}) {
  const cls = {
    muted: 'bg-card text-foreground border-border',
    ink: 'bg-blue-50 text-blue-700 border-blue-100',
    leaf: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    accent: 'bg-red-50 text-red-700 border-red-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  }[tone];
  return (
    <div
      className={cn(
        'relative border rounded-2xl p-6 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md cursor-default',
        cls,
      )}
    >
      <div className="text-[11px] font-semibold uppercase tracking-widest opacity-80">{label}</div>
      <div className="font-mono font-bold mt-2 text-4xl tracking-tight">{value}</div>
    </div>
  );
}

function EmptyMini({ text, tone }: { text: string; tone?: 'leaf' }) {
  const cls = tone === 'leaf' ? 'bg-emerald-50/50 border-emerald-200 text-emerald-600' : 'bg-muted/30 border-dashed border-border text-muted-foreground';
  return (
    <div className={cn('border rounded-2xl px-6 py-12 text-center text-lg font-medium', cls)}>
      <span>{text}</span>
    </div>
  );
}
