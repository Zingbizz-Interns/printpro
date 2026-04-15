'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth/store';
import { listJobs } from '@/lib/db/jobs';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Squiggle } from '@/components/decorations/squiggle';
import { Thumbtack } from '@/components/decorations/thumbtack';
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
import { cn, seededTilt } from '@/lib/utils';
import type { Job, PaymentStatus } from '@/types/db';

const PAY_FILTERS: { v: PaymentStatus | ''; l: string }[] = [
  { v: '', l: 'all' },
  { v: 'Unpaid', l: '● unpaid' },
  { v: 'Advance Paid', l: '⬡ advance' },
  { v: 'Fully Paid', l: '✓ paid' },
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
    <main className="px-4 sm:px-6 py-6 space-y-6">
      {/* Title */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-4xl md:text-5xl relative inline-block">
            How's the shop doing?
            <Squiggle className="absolute -bottom-2 left-0 w-full h-3" />
          </h1>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center bg-white border-2 border-pencil wobbly-md shadow-hand-soft overflow-hidden">
          {PERIODS.map((p, i) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'kb-tab text-sm',
                period === p ? 'kb-tab-active' : 'kb-tab-idle',
                i > 0 && 'border-l border-pencil/40',
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
                'px-3 py-1.5 text-sm font-bold border-2 wobbly-sm transition-all whitespace-nowrap',
                pay === f.v
                  ? 'bg-pencil text-white border-pencil shadow-hand-sm'
                  : 'bg-white text-pencil/70 border-dashed border-pencil/40 hover:border-solid',
              )}
            >
              {f.l}
            </button>
          ))}
        </div>

        <div className="flex-1" />
        <span className="text-sm text-pencil/60 italic font-mono">
          {filtered.length} job{filtered.length === 1 ? '' : 's'} in view
        </span>
      </div>

      {jobsQ.isError && (
        <Card tone="accent" wobbly="alt" className="p-5">
          <CardBody>
            <p className="text-accent font-bold">Couldn't load jobs.</p>
          </CardBody>
        </Card>
      )}

      {/* Stat tiles — 8 of them */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <Tile label="Orders" value={String(stats.orders)} tone="paper" tilt="l" />
        <Tile label="Revenue" value={fmt(stats.revenue)} tone="ink" tilt="r" big />
        <Tile label="Collected" value={fmt(stats.collected)} tone="leaf" tilt="l2" big />
        <Tile
          label="Pending due"
          value={fmt(stats.pending)}
          tone={stats.pending > 0 ? 'accent' : 'leaf'}
          tilt="r2"
          big
          tack={stats.pending > 0}
        />
        <Tile label="Today's orders" value={String(stats.today)} tone="postit" tilt="r" />
        <Tile
          label="Overdue"
          value={String(stats.overdue)}
          tone={stats.overdue > 0 ? 'accent' : 'muted'}
          tilt="l"
          tack={stats.overdue > 0}
        />
        <Tile label="GST bills" value={String(stats.gstCount)} tone="ink" tilt="r2" />
        <Tile label="GST amount" value={fmt(stats.gstAmt)} tone="amber" tilt="l2" big />
      </div>

      {/* Two-column tables */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent orders */}
        <section>
          <h2 className="text-2xl font-display mb-3 flex items-center gap-3">
            Recent orders
            <Badge tone="muted" className="text-xs">last {recent.length}</Badge>
          </h2>
          {recent.length === 0 ? (
            <EmptyMini text="No orders in this range." />
          ) : (
            <div className="hd-table shadow-hand-soft">
              <table className="w-full text-left text-sm font-body">
                <thead className="bg-pencil text-white font-display">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((j) => {
                    const t = statusTheme(j.jobStatus);
                    return (
                      <tr key={String(j.id)} className="border-t border-dashed border-pencil/30 hover:bg-postit/40">
                        <td className="px-3 py-2 font-mono font-bold">
                          <Link href={`/jobs/${j.id}`} className="hover:text-ink">
                            #{j.jobNo}
                          </Link>
                        </td>
                        <td className="px-3 py-2 truncate max-w-[220px]" title={j.companyName}>
                          {j.companyName || <span className="text-pencil/40 italic">no name</span>}
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            tone="paper"
                            className="text-xs border-2"
                            style={{ background: t.tint, color: t.ink, borderColor: t.ink }}
                          >
                            {t.mark} {t.label}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold">
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
          <h2 className="text-2xl font-display mb-3 flex items-center gap-3">
            Pending collections
            <Badge tone={pending.length > 0 ? 'accent' : 'leaf'} className="text-xs">
              {pending.length}
            </Badge>
          </h2>
          {pending.length === 0 ? (
            <EmptyMini text="Nothing outstanding." tone="leaf" />
          ) : (
            <div className="hd-table shadow-hand-soft">
              <table className="w-full text-left text-sm font-body">
                <thead className="bg-pencil text-white font-display">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Due</th>
                    <th className="px-3 py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map(({ job: j, balance }) => (
                    <tr key={String(j.id)} className="border-t border-dashed border-pencil/30 hover:bg-postit/40">
                      <td className="px-3 py-2 font-mono font-bold">
                        <Link href={`/jobs/${j.id}`} className="hover:text-ink">
                          #{j.jobNo}
                        </Link>
                      </td>
                      <td className="px-3 py-2 truncate max-w-[220px]" title={j.companyName}>
                        {j.companyName}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            'text-xs font-bold',
                            isOverdueDate(j.deliveryDate) ? 'text-accent' : 'text-pencil/70',
                          )}
                        >
                          {j.deliveryDate ? fmtShortDate(j.deliveryDate) : '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-accent">{fmt(balance)}</td>
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
  tilt,
  big,
  tack,
}: {
  label: string;
  value: string;
  tone: 'paper' | 'ink' | 'leaf' | 'accent' | 'postit' | 'amber' | 'muted';
  tilt: 'l' | 'r' | 'l2' | 'r2';
  big?: boolean;
  tack?: boolean;
}) {
  const tones: Record<typeof tone, string> = {
    paper: 'bg-white text-pencil',
    ink: 'bg-ink-lt text-ink',
    leaf: 'bg-leaf-lt text-leaf',
    accent: 'bg-accent-lt text-accent',
    postit: 'bg-postit text-pencil',
    amber: 'bg-amber-lt text-amber-sketch',
    muted: 'bg-muted text-pencil/70',
  };
  const tilts: Record<typeof tilt, string> = {
    l: 'tilt-l',
    r: 'tilt-r',
    l2: 'tilt-l2',
    r2: 'tilt-r2',
  };
  return (
    <div
      className={cn(
        'relative border-2 border-pencil shadow-hand wobbly-md p-4',
        tones[tone],
        tilts[tilt],
        'transition-transform hover:-translate-y-0.5',
      )}
    >
      {tack && <Thumbtack tone="accent" />}
      <div className="text-xs font-display uppercase tracking-wide opacity-60">{label}</div>
      <div className={cn('font-mono font-bold mt-1', big ? 'text-2xl' : 'text-3xl')}>{value}</div>
    </div>
  );
}

function EmptyMini({ text, tone }: { text: string; tone?: 'leaf' }) {
  const cls = tone === 'leaf' ? 'bg-leaf-lt border-leaf text-leaf' : 'bg-muted border-pencil/40 text-pencil/60';
  const tilt = seededTilt(text);
  return (
    <div className={cn('border-2 border-dashed wobbly-md px-4 py-6 text-center', cls, tilt)}>
      <span className="font-body italic">{text}</span>
    </div>
  );
}
