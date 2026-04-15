'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, X, Plus, Trash2, Pencil, Phone, Mail, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/lib/auth/store';
import { listCustomers, deleteCustomer, syncCustomerFromJob } from '@/lib/db/customers';
import { listJobs } from '@/lib/db/jobs';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Squiggle } from '@/components/decorations/squiggle';
import { CustomerModal } from '@/components/customers/customer-modal';
import { LedgerModal } from '@/components/customers/ledger-modal';
import { fmt, jobGrandTotal } from '@/lib/domain/totals';
import { cn, seededTilt } from '@/lib/utils';
import type { CustomerRow } from '@/types/db';

type PayFilter = '' | 'unpaid' | 'advance' | 'paid' | 'due';

const FILTERS: { v: PayFilter; label: string }[] = [
  { v: '', label: 'all' },
  { v: 'unpaid', label: '● unpaid' },
  { v: 'advance', label: '⬡ advance' },
  { v: 'paid', label: '✓ fully paid' },
  { v: 'due', label: '⚠ has dues' },
];

export default function CustomersPage() {
  const qc = useQueryClient();
  const isOwner = useAuthStore((s) => s.isOwner());

  const customersQ = useQuery({ queryKey: ['customers'], queryFn: listCustomers });
  const jobsQ = useQuery({ queryKey: ['jobs'], queryFn: listJobs });

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<PayFilter>('');
  const [editing, setEditing] = useState<CustomerRow | null | undefined>(undefined);
  const [ledgerCo, setLedgerCo] = useState<string | null>(null);

  const customers = customersQ.data ?? [];
  const jobs = jobsQ.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (q) {
        const hay = `${c.company_name} ${c.contact_person} ${c.contact_number} ${c.email_id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (!filter) return true;
      const cuJobs = jobs.filter((j) => j.companyName === c.company_name);
      if (!cuJobs.length) return false;
      const due = cuJobs.reduce((s, j) => {
        if (j.paymentStatus === 'Fully Paid') return s;
        return s + jobGrandTotal(j) - (Number(j.advancePaid) || 0);
      }, 0);
      const hasUnpaid = cuJobs.some((j) => j.paymentStatus === 'Unpaid');
      const hasAdvance = cuJobs.some((j) => j.paymentStatus === 'Advance Paid');
      const allPaid = cuJobs.every((j) => j.paymentStatus === 'Fully Paid');
      if (filter === 'unpaid') return hasUnpaid;
      if (filter === 'advance') return hasAdvance;
      if (filter === 'paid') return allPaid;
      if (filter === 'due') return due > 0.01;
      return true;
    });
  }, [customers, jobs, search, filter]);

  const delMut = useMutation({
    mutationFn: (id: number) => deleteCustomer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });

  const backfillMut = useMutation({
    mutationFn: async () => {
      let added = 0;
      const before = new Set(customers.map((c) => c.company_name.toLowerCase()));
      const seen = new Set<string>();
      for (const j of jobs) {
        if (!j.companyName) continue;
        const key = j.companyName.trim().toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        try {
          await syncCustomerFromJob(j);
          if (!before.has(key)) added += 1;
        } catch {
          /* noop */
        }
      }
      return added;
    },
    onSuccess: (added) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      window.alert(`Sync complete — ${added} new customer${added === 1 ? '' : 's'} added.`);
    },
  });

  const ledgerJobs = ledgerCo ? jobs.filter((j) => j.companyName === ledgerCo).slice().sort((a, b) => b.jobNo - a.jobNo) : [];

  function openLedger(co: string) {
    setLedgerCo(co);
  }

  return (
    <main className="px-4 sm:px-6 py-6 space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-4xl md:text-5xl relative inline-block">
            People we print for
            <Squiggle className="absolute -bottom-2 left-0 w-full h-3" />
          </h1>
          <p className="text-pencil/70 mt-2">Click a tile to open the customer ledger.</p>
        </div>
        <div className="flex gap-3">
          {isOwner && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (window.confirm('Sync all jobs into the customers list? Existing records won\'t be overwritten.'))
                  backfillMut.mutate();
              }}
              disabled={backfillMut.isPending}
            >
              <RefreshCw size={14} strokeWidth={2.5} />
              {backfillMut.isPending ? 'syncing…' : 'sync from jobs'}
            </Button>
          )}
          <Button type="button" variant="primary" onClick={() => setEditing(null)}>
            <Plus size={14} strokeWidth={3} /> add customer
          </Button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-pencil/50" strokeWidth={2.5} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search by name, phone, email…"
            className="w-full pl-9 pr-9 py-2 border-2 border-pencil wobbly-sm bg-white placeholder:text-pencil/40 placeholder:italic focus:border-ink focus:ring-2 focus:ring-ink/20"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-pencil/50 hover:text-accent">
              <X size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v)}
              className={cn(
                'px-3 py-1.5 text-sm font-bold border-2 wobbly-sm transition-all whitespace-nowrap',
                filter === f.v
                  ? 'bg-pencil text-white border-pencil shadow-hand-sm'
                  : 'bg-white text-pencil/70 border-dashed border-pencil/40 hover:border-solid',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <span className="text-sm text-pencil/60 italic font-mono">
          {filtered.length} of {customers.length}
        </span>
      </div>

      {/* Grid */}
      {customersQ.isLoading ? (
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-44 bg-white/70 border-2 border-dashed border-pencil/30 wobbly-md animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card tone="postit" decoration="tape" tilt="r" wobbly="alt" className="p-8 text-center max-w-md mx-auto">
          <CardBody>
            <p className="text-lg text-pencil/70">
              {customers.length === 0 ? 'No customers yet.' : 'No customers match your filters.'}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
          {filtered.map((cu) => (
            <CustomerTile
              key={cu.id}
              customer={cu}
              jobs={jobs.filter((j) => j.companyName === cu.company_name)}
              onOpen={() => openLedger(cu.company_name)}
              onEdit={isOwner ? () => setEditing(cu) : undefined}
              onDelete={
                isOwner
                  ? () => {
                      if (window.confirm(`Delete customer "${cu.company_name}"?`)) delMut.mutate(cu.id);
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}

      <CustomerModal
        open={editing !== undefined}
        onOpenChange={(o) => !o && setEditing(undefined)}
        customer={editing}
      />

      {ledgerCo && (
        <LedgerModal
          open={!!ledgerCo}
          onOpenChange={(o) => !o && setLedgerCo(null)}
          companyName={ledgerCo}
          jobs={ledgerJobs}
          isOwner={isOwner}
        />
      )}
    </main>
  );
}

function CustomerTile({
  customer,
  jobs,
  onOpen,
  onEdit,
  onDelete,
}: {
  customer: CustomerRow;
  jobs: { paymentStatus: string; advancePaid: number | string; items: unknown[]; jobNo: number; gstEnabled: boolean; discountPct: number | string; roundOff: boolean }[];
  onOpen: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const totalBilled = jobs.reduce(
    (s, j) =>
      s +
      jobGrandTotal({
        items: j.items as never,
        gstEnabled: j.gstEnabled,
        discountPct: Number(j.discountPct) || 0,
        roundOff: j.roundOff,
      }),
    0,
  );
  const totalDue = jobs.reduce((s, j) => {
    if (j.paymentStatus === 'Fully Paid') return s;
    return (
      s +
      jobGrandTotal({
        items: j.items as never,
        gstEnabled: j.gstEnabled,
        discountPct: Number(j.discountPct) || 0,
        roundOff: j.roundOff,
      }) -
      (Number(j.advancePaid) || 0)
    );
  }, 0);
  const tilt = seededTilt(customer.company_name);
  return (
    <div className={cn('relative', tilt)}>
      <div
        onClick={onOpen}
        className="bg-white border-2 border-pencil wobbly-md shadow-hand-soft p-4 cursor-pointer hover:shadow-hand hover:-translate-y-0.5 transition-all"
      >
        <div className="font-display text-xl truncate" title={customer.company_name}>
          {customer.company_name}
        </div>
        {customer.contact_person && (
          <div className="text-sm text-pencil/70 mt-0.5 truncate">👤 {customer.contact_person}</div>
        )}
        <div className="flex flex-wrap gap-3 mt-2 text-sm text-pencil/70">
          {customer.contact_number && (
            <a
              href={`https://wa.me/${customer.contact_number.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 hover:text-leaf"
            >
              <Phone size={12} strokeWidth={2.5} /> {customer.contact_number}
            </a>
          )}
          {customer.email_id && (
            <a
              href={`mailto:${customer.email_id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 hover:text-ink"
            >
              <Mail size={12} strokeWidth={2.5} /> {customer.email_id}
            </a>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-dashed border-pencil/30 grid grid-cols-3 gap-2 text-center">
          <Stat label="orders" value={String(jobs.length)} />
          <Stat label="billed" value={fmt(totalBilled)} tone="ink" />
          <Stat label="due" value={fmt(totalDue)} tone={totalDue > 0.01 ? 'accent' : 'leaf'} />
        </div>
        {(onEdit || onDelete) && (
          <div className="mt-3 flex gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="kb-action wobbly-sm kb-action-neutral"
              >
                <Pencil size={12} strokeWidth={2.5} /> edit
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="kb-action wobbly-sm kb-action-danger"
              >
                <Trash2 size={12} strokeWidth={2.5} />
              </button>
            )}
            {customer.gst_no && (
              <Badge tone="ink" className="text-xs ml-auto" dashed>
                GST
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'ink' | 'leaf' | 'accent';
}) {
  const color = tone === 'ink' ? 'text-ink' : tone === 'leaf' ? 'text-leaf' : tone === 'accent' ? 'text-accent' : 'text-pencil';
  return (
    <div>
      <div className={`font-mono font-bold ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-pencil/50">{label}</div>
    </div>
  );
}
