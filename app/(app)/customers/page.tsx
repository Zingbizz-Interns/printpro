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
import { CustomerModal } from '@/components/customers/customer-modal';
import { LedgerModal } from '@/components/customers/ledger-modal';
import { fmt, jobGrandTotal } from '@/lib/domain/totals';
import { cn } from '@/lib/utils';
import type { CustomerRow } from '@/types/db';

type PayFilter = '' | 'unpaid' | 'advance' | 'paid' | 'due';

const FILTERS: { v: PayFilter; label: string }[] = [
  { v: '', label: 'All' },
  { v: 'unpaid', label: '● Unpaid' },
  { v: 'advance', label: '⬡ Advance' },
  { v: 'paid', label: '✓ Fully Paid' },
  { v: 'due', label: '⚠ Has Dues' },
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
    <main className="px-4 sm:px-8 py-8 space-y-8 max-w-[1800px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-body font-bold text-foreground relative inline-block tracking-tight">
            People We Print For
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">Click a tile to open the customer ledger.</p>
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
              className="shadow-sm"
            >
              <RefreshCw size={16} strokeWidth={2.5} className="mr-1.5" />
              {backfillMut.isPending ? 'Syncing…' : 'Sync From Jobs'}
            </Button>
          )}
          <Button type="button" variant="primary" onClick={() => setEditing(null)} className="shadow-md">
            <Plus size={16} strokeWidth={3} className="mr-1.5" /> Add Customer
          </Button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-4 items-center bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, email…"
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-background placeholder:text-muted-foreground focus:border-transparent focus:ring-2 focus:ring-ring transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v)}
              className={cn(
                'px-4 py-2 text-sm font-semibold rounded-xl border transition-all shadow-sm',
                filter === f.v
                  ? 'bg-foreground text-white border-foreground ring-1 ring-inset ring-foreground/20'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <span className="text-sm text-muted-foreground font-mono font-medium py-1 px-3 bg-muted rounded-lg border border-border">
          {filtered.length} of {customers.length}
        </span>
      </div>

      {/* Grid */}
      {customersQ.isLoading ? (
        <div className="grid gap-6 grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-52 bg-muted/30 rounded-3xl border border-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center max-w-md mx-auto shadow-sm border-dashed rounded-3xl bg-muted/30">
          <CardBody>
            <p className="text-xl text-muted-foreground font-medium">
              {customers.length === 0 ? 'No customers yet.' : 'No customers match your filters.'}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
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
  return (
    <div className="relative group">
      <div
        onClick={onOpen}
        className="bg-card border border-border shadow-sm rounded-3xl p-6 cursor-pointer hover:shadow-lg hover:border-muted-foreground/30 transition-all duration-300 transform group-hover:-translate-y-1"
      >
        <div className="font-body font-bold text-xl text-foreground truncate" title={customer.company_name}>
          {customer.company_name}
        </div>
        {customer.contact_person && (
          <div className="text-sm text-muted-foreground mt-1 truncate font-medium">👤 {customer.contact_person}</div>
        )}
        <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground font-medium">
          {customer.contact_number && (
            <a
              href={`https://wa.me/${customer.contact_number.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 hover:text-emerald-600 transition-colors"
            >
              <Phone size={14} strokeWidth={2} /> {customer.contact_number}
            </a>
          )}
          {customer.email_id && (
            <a
              href={`mailto:${customer.email_id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 hover:text-blue-600 transition-colors"
            >
              <Mail size={14} strokeWidth={2} /> {customer.email_id}
            </a>
          )}
        </div>
        <div className="mt-5 pt-4 border-t border-border grid grid-cols-3 gap-3 text-center">
          <Stat label="Orders" value={String(jobs.length)} />
          <Stat label="Billed" value={fmt(totalBilled)} tone="ink" />
          <Stat label="Due" value={fmt(totalDue)} tone={totalDue > 0.01 ? 'accent' : 'leaf'} />
        </div>
        {(onEdit || onDelete) && (
          <div className="mt-5 flex gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="flex items-center justify-center p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              >
                <Pencil size={16} strokeWidth={2} />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="flex items-center justify-center p-2 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
              >
                <Trash2 size={16} strokeWidth={2} />
              </button>
            )}
            {customer.gst_no && (
              <Badge tone="ink" className="text-[10px] ml-auto py-0.5 rounded-lg border shadow-sm">
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
  const color = tone === 'ink' ? 'text-blue-600' : tone === 'leaf' ? 'text-emerald-600' : tone === 'accent' ? 'text-red-500' : 'text-muted-foreground';
  return (
    <div className="bg-muted/30 rounded-xl p-2">
      <div className={`font-mono font-bold text-[15px] ${color}`}>{value}</div>
      <div className="text-[9px] uppercase tracking-widest font-semibold text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
