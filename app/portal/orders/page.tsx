'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RotateCw, Search } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/portal/status-pill';
import { ReorderModal } from '@/components/portal/reorder-modal';
import { useCustomerAuthStore } from '@/lib/auth/customer-store';
import { listMyJobs } from '@/lib/db/portal-orders';
import { fmt, getTotalPaid, jobGrandTotal } from '@/lib/domain/totals';
import { ALL_STATUSES } from '@/lib/kanban/status-theme';
import type { Job, JobStatus } from '@/types/db';

type PaidFilter = 'all' | 'outstanding' | 'paid';

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

function itemsSummary(j: Job): string {
  if (!j.items.length) return '—';
  const first = j.items[0].category || j.items[0].description || '—';
  const rest = j.items.length - 1;
  return rest > 0 ? `${first} +${rest}` : first;
}

export default function OrdersPage() {
  const user = useCustomerAuthStore((s) => s.currentUser);
  const jobsQ = useQuery({
    queryKey: ['portal-jobs', user?.id],
    queryFn: () => listMyJobs(user!.id),
    enabled: Boolean(user?.id),
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');
  const [paidFilter, setPaidFilter] = useState<PaidFilter>('all');
  const [reorderTarget, setReorderTarget] = useState<Job | null>(null);

  const rows = useMemo(() => {
    const all = (jobsQ.data ?? []).map((j) => {
      const total = jobGrandTotal(j);
      const paid = getTotalPaid(j);
      const balance = Math.max(total - paid, 0);
      return { job: j, total, paid, balance };
    });

    const needle = search.trim().toLowerCase();
    return all.filter(({ job, balance, total }) => {
      if (statusFilter !== 'all' && job.jobStatus !== statusFilter) return false;
      if (paidFilter === 'outstanding' && !(balance > 0)) return false;
      if (paidFilter === 'paid' && !(balance === 0 && total > 0)) return false;
      if (!needle) return true;
      const hay =
        `${job.jobNo} ${job.orderDate} ${itemsSummary(job)} ${job.jobStatus}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [jobsQ.data, search, statusFilter, paidFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Your orders</h1>
        <p className="mt-1 text-muted-foreground">Every job we&apos;ve received for you.</p>
      </div>

      <Card>
        <CardBody className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by job #, item, status…"
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as JobStatus | 'all')}
              className="h-11 rounded-xl border border-border bg-card px-3 text-sm font-body font-medium"
            >
              <option value="all">All statuses</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={paidFilter}
              onChange={(e) => setPaidFilter(e.target.value as PaidFilter)}
              className="h-11 rounded-xl border border-border bg-card px-3 text-sm font-body font-medium"
            >
              <option value="all">All payments</option>
              <option value="outstanding">Outstanding</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </CardBody>
      </Card>

      {jobsQ.isLoading && (
        <div className="py-16 text-center text-muted-foreground animate-pulse">Loading orders…</div>
      )}

      {jobsQ.isSuccess && rows.length === 0 && (
        <Card tone="muted" className="border-dashed">
          <CardBody className="py-16 text-center">
            <p className="font-body font-semibold text-lg">No orders match</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {jobsQ.data?.length
                ? 'Try a different filter or clear the search.'
                : "You don't have any orders linked to this account yet."}
            </p>
            {jobsQ.data && jobsQ.data.length > 0 && (
              <div className="mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                    setPaidFilter('all');
                  }}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {jobsQ.isSuccess && rows.length > 0 && (
        <Card className="overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                  <th className="px-4 py-3">Job #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ job, total, paid, balance }) => (
                  <tr
                    key={job.id}
                    className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-medium">
                      <Link href={`/portal/orders/${job.id}`} className="hover:underline">
                        #{job.jobNo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(job.orderDate)}</td>
                    <td className="px-4 py-3 max-w-[18rem] truncate">{itemsSummary(job)}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmt(total)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700">{fmt(paid)}</td>
                    <td
                      className={
                        'px-4 py-3 text-right font-semibold ' +
                        (balance > 0 ? 'text-amber-700' : 'text-muted-foreground')
                      }
                    >
                      {balance > 0 ? fmt(balance) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={job.jobStatus} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {job.jobStatus === 'Delivered' && job.items.length > 0 && (
                        <button
                          onClick={() => setReorderTarget(job)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold hover:bg-muted/60"
                          title="Reorder this job"
                        >
                          <RotateCw size={12} /> Reorder
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <ul className="md:hidden divide-y divide-border">
            {rows.map(({ job, total, balance }) => (
              <li key={job.id}>
                <Link href={`/portal/orders/${job.id}`} className="block px-4 py-4 hover:bg-muted/30">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">#{job.jobNo}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(job.orderDate)}</span>
                      </div>
                      <div className="mt-0.5 text-sm truncate">{itemsSummary(job)}</div>
                    </div>
                    <StatusPill status={job.jobStatus} size="sm" />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{fmt(total)}</span>
                    <span className={balance > 0 ? 'text-amber-700 font-semibold' : 'text-emerald-700'}>
                      {balance > 0 ? `Balance ${fmt(balance)}` : 'Paid'}
                    </span>
                  </div>
                </Link>
                {job.jobStatus === 'Delivered' && job.items.length > 0 && (
                  <div className="px-4 pb-3">
                    <button
                      onClick={() => setReorderTarget(job)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold hover:bg-muted/60"
                    >
                      <RotateCw size={12} /> Reorder
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {reorderTarget && (
        <ReorderModal
          open={Boolean(reorderTarget)}
          onOpenChange={(next) => {
            if (!next) setReorderTarget(null);
          }}
          sourceJob={reorderTarget}
        />
      )}
    </div>
  );
}
