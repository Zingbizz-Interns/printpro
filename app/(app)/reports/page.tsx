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
import { Input, Field } from '@/components/ui/input';
import { fmt, jobGrandTotal, itemsSubtotal } from '@/lib/domain/totals';
import { fmtShortDate, isOverdueDate } from '@/lib/kanban/date-utils';
import { statusTheme } from '@/lib/kanban/status-theme';
import { downloadCsv } from '@/lib/csv';
import { cn } from '@/lib/utils';
import type { Job, PaymentStatus } from '@/types/db';

type ReportType = 'all' | 'paid' | 'pending' | 'advance' | 'gst' | 'delivered';

const REPORT_TYPES: { v: ReportType; l: string }[] = [
  { v: 'all', l: 'All Orders' },
  { v: 'paid', l: '✓ Fully Paid' },
  { v: 'pending', l: '● Pending' },
  { v: 'advance', l: '⬡ Advance Paid' },
  { v: 'gst', l: '🧾 GST Only' },
  { v: 'delivered', l: '📦 Delivered' },
];

const PAY_FILTERS: { v: PaymentStatus | ''; l: string }[] = [
  { v: '', l: 'Any Payment' },
  { v: 'Unpaid', l: 'Unpaid' },
  { v: 'Advance Paid', l: 'Advance Paid' },
  { v: 'Fully Paid', l: 'Fully Paid' },
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
    <main className="px-4 sm:px-8 py-8 space-y-8 max-w-[1800px] mx-auto">
      {/* Title */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-body font-bold text-foreground tracking-tight">
            Pull a Report
          </h1>
          <p className="text-muted-foreground mt-3 font-medium text-lg">Filter, scan, and export to CSV (Excel-friendly).</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button type="button" variant="secondary" onClick={exportFiltered} className="shadow-sm border-border bg-card hover:bg-muted">
            <Download size={16} strokeWidth={2.5} className="mr-1.5" /> Export Filtered
          </Button>
          <Button type="button" variant="primary" onClick={exportAll} className="shadow-md">
            <FileDown size={16} strokeWidth={2.5} className="mr-1.5" /> Export All Jobs
          </Button>
        </div>
      </div>

      {/* Filters card */}
      <Card className="border border-border shadow-sm rounded-3xl p-8 bg-card relative z-10 w-full">
        <div className="grid md:grid-cols-4 gap-6">
          <Field label="From">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="shadow-inner" />
          </Field>
          <Field label="To">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="shadow-inner" />
          </Field>
          <Field label="Report Type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ReportType)}
              className="w-full text-base bg-card border border-border rounded-xl px-4 py-2.5 font-medium shadow-inner focus:border-transparent focus:ring-2 focus:ring-ring focus:outline-none transition-all cursor-pointer"
            >
              {REPORT_TYPES.map((r) => (
                <option key={r.v} value={r.v}>
                  {r.l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Payment Status">
            <select
              value={pay}
              onChange={(e) => setPay(e.target.value as PaymentStatus | '')}
              className="w-full text-base bg-card border border-border rounded-xl px-4 py-2.5 font-medium shadow-inner focus:border-transparent focus:ring-2 focus:ring-ring focus:outline-none transition-all cursor-pointer"
            >
              {PAY_FILTERS.map((p) => (
                <option key={p.v} value={p.v}>
                  {p.l}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Tile label="Orders Found" value={String(summary.count)} tone="muted" />
        <Tile label="Total Billed" value={fmt(summary.billed)} tone="ink" />
        <Tile label="Collected" value={fmt(summary.collected)} tone="leaf" />
        <Tile
          label="Pending"
          value={fmt(summary.pending)}
          tone={summary.pending > 0 ? 'accent' : 'leaf'}
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center max-w-md mx-auto shadow-sm border-dashed border-border rounded-3xl bg-muted/30">
          <CardBody>
            <p className="text-xl text-muted-foreground font-medium">No orders match these filters.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="overflow-x-auto border border-border rounded-2xl shadow-sm bg-card">
          <table className="w-full text-left text-sm font-body whitespace-nowrap">
            <thead className="bg-muted text-muted-foreground font-semibold uppercase tracking-wider text-[10px] border-b border-border">
              <tr>
                <th className="px-4 py-3">Job #</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3 text-center">Items</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
                <th className="px-4 py-3 text-right">GST</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
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
                  <tr key={String(j.id)} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-foreground">
                      <Link href={`/jobs/${j.id}`} className="hover:text-blue-600 transition-colors">
                        #{j.jobNo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-muted-foreground">{fmtShortDate(j.orderDate)}</td>
                    <td className="px-4 py-3 font-medium truncate max-w-[180px] text-foreground" title={j.companyName}>
                      {j.companyName}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-muted px-2 py-0.5 rounded-md font-mono text-xs">{j.items.length}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className="text-[10px] font-semibold border px-2 py-0.5 rounded-md shadow-sm"
                        style={{ background: t.tint, color: t.ink, borderColor: t.ink }}
                      >
                        {t.mark} {t.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={pStatus === 'Fully Paid' ? 'leaf' : pStatus === 'Advance Paid' ? 'amber' : 'accent'} className="text-[10px] font-semibold rounded-md">
                        {pStatus}
                      </Badge>
                    </td>
                    <td className={cn('px-4 py-3 font-medium text-muted-foreground', isOverdueDate(j.deliveryDate) && j.jobStatus !== 'Delivered' && 'text-red-500 font-bold')}>
                      {j.deliveryDate ? fmtShortDate(j.deliveryDate) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">{fmt(sub)}</td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">{j.gstEnabled ? fmt(gst) : '—'}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-foreground">{fmt(gt)}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600 font-medium">{fmt(adv)}</td>
                    <td
                      className={cn(
                        'px-4 py-3 text-right font-mono font-bold',
                        bal > 0.01 ? 'text-red-500' : 'text-emerald-500',
                      )}
                    >
                      {fmt(Math.max(0, bal))}
                    </td>
                    <td className="px-4 py-3 font-medium text-muted-foreground">{j.createdBy || '—'}</td>
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
}: {
  label: string;
  value: string;
  tone: 'muted' | 'ink' | 'leaf' | 'accent' | 'amber';
}) {
  const cls = {
    muted: 'bg-muted/30 text-foreground border-border',
    ink: 'bg-blue-50 text-blue-700 border-blue-100',
    leaf: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    accent: 'bg-red-50 text-red-700 border-red-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  }[tone];
  
  return (
    <div className={cn(cls, 'border rounded-2xl p-6 shadow-sm')}>
      <div className="text-[11px] font-semibold uppercase tracking-widest opacity-80">{label}</div>
      <div className="font-mono font-bold text-3xl mt-2">{value}</div>
    </div>
  );
}
