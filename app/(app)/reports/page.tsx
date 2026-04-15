'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Download, FileDown } from 'lucide-react';
import { useAuthStore } from '@/lib/auth/store';
import { listJobs } from '@/lib/db/jobs';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Squiggle } from '@/components/decorations/squiggle';
import { Input, Field } from '@/components/ui/input';
import { fmt, jobGrandTotal, itemsSubtotal } from '@/lib/domain/totals';
import { fmtShortDate, isOverdueDate } from '@/lib/kanban/date-utils';
import { statusTheme } from '@/lib/kanban/status-theme';
import { downloadCsv } from '@/lib/csv';
import { cn } from '@/lib/utils';
import type { Job, PaymentStatus } from '@/types/db';

type ReportType = 'all' | 'paid' | 'pending' | 'advance' | 'gst' | 'delivered';

const REPORT_TYPES: { v: ReportType; l: string }[] = [
  { v: 'all', l: 'All orders' },
  { v: 'paid', l: '✓ Fully paid' },
  { v: 'pending', l: '● Pending' },
  { v: 'advance', l: '⬡ Advance paid' },
  { v: 'gst', l: '🧾 GST only' },
  { v: 'delivered', l: '📦 Delivered' },
];

const PAY_FILTERS: { v: PaymentStatus | ''; l: string }[] = [
  { v: '', l: 'any payment' },
  { v: 'Unpaid', l: 'unpaid' },
  { v: 'Advance Paid', l: 'advance' },
  { v: 'Fully Paid', l: 'fully paid' },
];

export default function ReportsPage() {
  const router = useRouter();
  const isOwner = useAuthStore((s) => s.isOwner());

  useEffect(() => {
    if (!isOwner) router.replace('/kanban');
  }, [isOwner, router]);

  const jobsQ = useQuery({ queryKey: ['jobs'], queryFn: listJobs });

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 8)}01`;
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [type, setType] = useState<ReportType>('all');
  const [pay, setPay] = useState<PaymentStatus | ''>('');

  const filtered = useMemo(() => {
    const all = jobsQ.data ?? [];
    return all.filter((j) => {
      // Date range on order_date (uses string compare, safe for ISO YYYY-MM-DD)
      if (j.orderDate) {
        if (from && j.orderDate < from) return false;
        if (to && j.orderDate > to) return false;
      }
      // Type
      if (type === 'paid' && j.paymentStatus !== 'Fully Paid') return false;
      if (type === 'pending' && j.paymentStatus === 'Fully Paid') return false;
      if (type === 'advance' && j.paymentStatus !== 'Advance Paid') return false;
      if (type === 'gst' && !j.gstEnabled) return false;
      if (type === 'delivered' && j.jobStatus !== 'Delivered') return false;
      // Payment dropdown (extra layer)
      if (pay && j.paymentStatus !== pay) return false;
      return true;
    });
  }, [jobsQ.data, from, to, type, pay]);

  const summary = useMemo(() => {
    let billed = 0;
    let collected = 0;
    let pending = 0;
    for (const j of filtered) {
      const gt = jobGrandTotal(j);
      const adv = Number(j.advancePaid) || 0;
      billed += gt;
      if (j.paymentStatus === 'Fully Paid') collected += gt;
      else {
        collected += adv;
        pending += gt - adv;
      }
    }
    return { count: filtered.length, billed, collected, pending };
  }, [filtered]);

  function exportFiltered() {
    const rows = filtered.map(toCsvRow);
    downloadCsv(`print-pro-report-${from}-to-${to}.csv`, rows, CSV_COLUMNS);
  }

  function exportAll() {
    const rows = (jobsQ.data ?? []).map(toCsvRow);
    downloadCsv(`print-pro-all-jobs-${today}.csv`, rows, CSV_COLUMNS);
  }

  if (!isOwner) return null;

  return (
    <main className="px-4 sm:px-6 py-6 space-y-6">
      {/* Title */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-4xl md:text-5xl relative inline-block">
            Pull a report
            <Squiggle className="absolute -bottom-2 left-0 w-full h-3" />
          </h1>
          <p className="text-pencil/70 mt-2">Filter, scan, and export to CSV (Excel-friendly).</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button type="button" variant="secondary" onClick={exportFiltered}>
            <Download size={14} strokeWidth={2.5} /> export filtered
          </Button>
          <Button type="button" variant="primary" onClick={exportAll}>
            <FileDown size={14} strokeWidth={2.5} /> export all jobs
          </Button>
        </div>
      </div>

      {/* Filters card */}
      <Card tone="paper" wobbly="md" decoration="tape" className="overflow-visible">
        <CardBody className="space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            <Field label="From">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="To">
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
            <Field label="Report type">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ReportType)}
                className="w-full text-base bg-white border-2 border-pencil wobbly-sm px-3 py-2.5 focus:border-ink focus:ring-2 focus:ring-ink/20"
              >
                {REPORT_TYPES.map((r) => (
                  <option key={r.v} value={r.v}>
                    {r.l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Payment status">
              <select
                value={pay}
                onChange={(e) => setPay(e.target.value as PaymentStatus | '')}
                className="w-full text-base bg-white border-2 border-pencil wobbly-sm px-3 py-2.5 focus:border-ink focus:ring-2 focus:ring-ink/20"
              >
                {PAY_FILTERS.map((p) => (
                  <option key={p.v} value={p.v}>
                    {p.l}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </CardBody>
      </Card>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Tile label="Orders found" value={String(summary.count)} tone="paper" tilt="l" />
        <Tile label="Total billed" value={fmt(summary.billed)} tone="ink" tilt="r" />
        <Tile label="Collected" value={fmt(summary.collected)} tone="leaf" tilt="l2" />
        <Tile
          label="Pending"
          value={fmt(summary.pending)}
          tone={summary.pending > 0 ? 'accent' : 'leaf'}
          tilt="r2"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card tone="postit" wobbly="alt" tilt="l" className="p-8 text-center max-w-md mx-auto">
          <CardBody>
            <p className="text-lg text-pencil/70">No orders match these filters.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="hd-table shadow-hand">
          <table className="w-full text-left text-sm font-body">
            <thead className="bg-pencil text-white font-display">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Items</th>
                <th className="px-3 py-2">Job status</th>
                <th className="px-3 py-2">Payment</th>
                <th className="px-3 py-2">Delivery</th>
                <th className="px-3 py-2 text-right">Subtotal</th>
                <th className="px-3 py-2 text-right">GST</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Paid</th>
                <th className="px-3 py-2 text-right">Balance</th>
                <th className="px-3 py-2">By</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((j) => {
                const gt = jobGrandTotal(j);
                const adv = Number(j.advancePaid) || 0;
                const bal = gt - adv;
                const sub = itemsSubtotal(j.items);
                const gst = j.gstEnabled
                  ? sub * (1 - (Number(j.discountPct) || 0) / 100) * 0.18
                  : 0;
                const t = statusTheme(j.jobStatus);
                const pStatus = j.paymentStatus;
                return (
                  <tr key={String(j.id)} className="border-t border-dashed border-pencil/30 hover:bg-postit/40">
                    <td className="px-3 py-2 font-mono font-bold">
                      <Link href={`/jobs/${j.id}`} className="hover:text-ink">
                        #{j.jobNo}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{fmtShortDate(j.orderDate)}</td>
                    <td className="px-3 py-2 truncate max-w-[180px]" title={j.companyName}>
                      {j.companyName}
                    </td>
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
                    <td className="px-3 py-2">
                      <Badge tone={pStatus === 'Fully Paid' ? 'leaf' : pStatus === 'Advance Paid' ? 'amber' : 'accent'} className="text-xs">
                        {pStatus}
                      </Badge>
                    </td>
                    <td className={cn('px-3 py-2', isOverdueDate(j.deliveryDate) && j.jobStatus !== 'Delivered' && 'text-accent font-bold')}>
                      {j.deliveryDate ? fmtShortDate(j.deliveryDate) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(sub)}</td>
                    <td className="px-3 py-2 text-right font-mono">{j.gstEnabled ? fmt(gst) : '—'}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold">{fmt(gt)}</td>
                    <td className="px-3 py-2 text-right font-mono text-leaf">{fmt(adv)}</td>
                    <td
                      className={cn(
                        'px-3 py-2 text-right font-mono font-bold',
                        bal > 0.01 ? 'text-accent' : 'text-leaf',
                      )}
                    >
                      {fmt(Math.max(0, bal))}
                    </td>
                    <td className="px-3 py-2 text-pencil/70">{j.createdBy || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

const CSV_COLUMNS = [
  'job_no',
  'order_date',
  'company',
  'contact',
  'phone',
  'gst_no',
  'delivery_date',
  'job_status',
  'payment_status',
  'items',
  'subtotal',
  'discount_pct',
  'gst_enabled',
  'gst_amount',
  'grand_total',
  'advance_paid',
  'balance_due',
  'created_by',
] as const;

type CsvRow = Record<(typeof CSV_COLUMNS)[number], string | number>;

function toCsvRow(j: Job): CsvRow {
  const sub = itemsSubtotal(j.items);
  const afterDisc = sub * (1 - (Number(j.discountPct) || 0) / 100);
  const gstAmt = j.gstEnabled ? afterDisc * 0.18 : 0;
  const gt = jobGrandTotal(j);
  const adv = Number(j.advancePaid) || 0;
  return {
    job_no: j.jobNo,
    order_date: j.orderDate,
    company: j.companyName,
    contact: j.contactPerson,
    phone: j.contactNumber,
    gst_no: j.gstNo,
    delivery_date: j.deliveryDate,
    job_status: j.jobStatus,
    payment_status: j.paymentStatus,
    items: j.items.length,
    subtotal: round2(sub),
    discount_pct: Number(j.discountPct) || 0,
    gst_enabled: j.gstEnabled ? 'Yes' : 'No',
    gst_amount: round2(gstAmt),
    grand_total: round2(gt),
    advance_paid: round2(adv),
    balance_due: round2(Math.max(0, gt - adv)),
    created_by: j.createdBy,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function Tile({
  label,
  value,
  tone,
  tilt,
}: {
  label: string;
  value: string;
  tone: 'paper' | 'ink' | 'leaf' | 'accent' | 'postit' | 'amber';
  tilt: 'l' | 'r' | 'l2' | 'r2';
}) {
  const tones: Record<typeof tone, string> = {
    paper: 'bg-white text-pencil',
    ink: 'bg-ink-lt text-ink',
    leaf: 'bg-leaf-lt text-leaf',
    accent: 'bg-accent-lt text-accent',
    postit: 'bg-postit text-pencil',
    amber: 'bg-amber-lt text-amber-sketch',
  };
  const tilts = { l: 'tilt-l', r: 'tilt-r', l2: 'tilt-l2', r2: 'tilt-r2' };
  return (
    <div className={cn('border-2 border-pencil shadow-hand wobbly-md p-4', tones[tone], tilts[tilt])}>
      <div className="text-xs font-display uppercase tracking-wide opacity-60">{label}</div>
      <div className="font-mono font-bold text-2xl mt-1">{value}</div>
    </div>
  );
}
