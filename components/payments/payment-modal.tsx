'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Field, Label } from '@/components/ui/input';
import { addPayment, deletePayment, listPaymentsForJob } from '@/lib/db/payments';
import { fmt } from '@/lib/domain/totals';
import { fmtShortDate } from '@/lib/kanban/date-utils';
import { cn } from '@/lib/utils';
import type { PaymentMode, PartialPaymentRow } from '@/types/db';
import { Trash2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  jobId: number;
  jobNo: number;
  companyName: string;
  grandTotal: number;
  advancePaid: number;
  isOwner: boolean;
}

const MODES: { v: PaymentMode; label: string; tone: 'ink' | 'leaf' | 'postit' | 'amber' | 'accent' }[] = [
  { v: 'UPI', label: '📱 UPI', tone: 'ink' },
  { v: 'Cash', label: '💵 Cash', tone: 'leaf' },
  { v: 'Bank Transfer', label: '🏦 Bank', tone: 'postit' },
  { v: 'Cheque', label: '📄 Cheque', tone: 'amber' },
  { v: 'Card', label: '💳 Card', tone: 'accent' },
];

export function PaymentModal({
  open,
  onOpenChange,
  jobId,
  jobNo,
  companyName,
  grandTotal,
  advancePaid,
  isOwner,
}: Props) {
  const qc = useQueryClient();
  const paymentsQ = useQuery({
    queryKey: ['payments', jobId],
    queryFn: () => listPaymentsForJob(jobId),
    enabled: open,
  });

  const payments = paymentsQ.data ?? [];
  const partialTotal = payments.reduce((s, p) => s + (parseFloat(String(p.amount)) || 0), 0);
  const totalPaid = advancePaid + partialTotal;
  const balance = grandTotal - totalPaid;

  const [amt, setAmt] = useState<string>('');
  const [dt, setDt] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState<PaymentMode>('UPI');
  const [note, setNote] = useState<string>('');
  const [err, setErr] = useState<string | null>(null);

  const addMut = useMutation({
    mutationFn: async () => {
      const a = parseFloat(amt);
      if (!Number.isFinite(a) || a <= 0) throw new Error('Enter a valid amount.');
      if (!dt) throw new Error('Select a date.');
      await addPayment({ jobId, amount: a, paidOn: dt, mode, note });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments', jobId] });
      qc.invalidateQueries({ queryKey: ['jobs'] }); // payment status may shift
      setAmt('');
      setNote('');
      setErr(null);
    },
    onError: (e: Error) => setErr(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: number) => deletePayment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments', jobId] });
      qc.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title={
        <div className="flex items-center gap-3 font-body font-bold text-2xl tracking-tight">
          Payments
          <span className="font-mono text-xl text-muted-foreground bg-muted px-2 py-0.5 rounded-lg border border-border">#{jobNo}</span>
        </div>
      }
      description={<span className="font-medium text-muted-foreground">{companyName || 'Unknown Customer'}</span>}
    >
      <div className="space-y-8 mt-4">
        {/* Summary strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Summary label="Total" value={fmt(grandTotal)} tone="ink" />
          <Summary label="Advance" value={fmt(advancePaid)} tone="postit" />
          <Summary label="Paid so far" value={fmt(totalPaid)} tone="leaf" />
          <Summary
            label="Balance"
            value={fmt(Math.max(0, balance))}
            tone={balance > 0.01 ? 'accent' : 'leaf'}
          />
        </div>

        {/* Staff: read-only banner */}
        {!isOwner && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-sm font-semibold flex items-center shadow-sm">
            🔒 Payment history is visible to admin only. You can see the balance above.
          </div>
        )}

        {/* Payment list */}
        {isOwner && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-body font-bold text-lg tracking-tight">History</h3>
              <Badge tone="muted" className="text-xs font-semibold px-2 py-1">
                {payments.length + (advancePaid > 0 ? 1 : 0)} entries
              </Badge>
            </div>

            <div className="overflow-hidden border border-border rounded-2xl shadow-sm bg-card">
              <table className="w-full text-left font-body text-sm whitespace-nowrap">
                <thead className="bg-muted text-muted-foreground font-semibold uppercase tracking-wider text-[10px] border-b border-border">
                  <tr>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3 w-full">Note</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {advancePaid > 0 && (
                    <tr className="bg-emerald-50/50 hover:bg-emerald-50 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground font-medium">initial</td>
                      <td className="px-4 py-3">
                        <Badge tone="leaf" className="text-[10px] font-semibold border-emerald-200">
                          ● Advance
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground italic truncate">captured with job</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{fmt(advancePaid)}</td>
                      <td />
                    </tr>
                  )}

                  {paymentsQ.isLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground font-medium animate-pulse">
                        Loading…
                      </td>
                    </tr>
                  )}
                  {!paymentsQ.isLoading && payments.length === 0 && advancePaid === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground font-medium border-dashed border-border border rounded-xl m-2 bg-muted/30">
                        No payments recorded yet.
                      </td>
                    </tr>
                  )}
                  {payments.map((p) => (
                    <PaymentRow
                      key={p.id}
                      row={p}
                      onDelete={() => {
                        if (window.confirm('Remove this payment?')) delMut.mutate(p.id);
                      }}
                      deleting={delMut.isPending}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add payment */}
        {isOwner && (
          <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-foreground" />
            
            <h3 className="font-body font-bold text-xl tracking-tight">Record Payment</h3>

            {err && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-600 font-semibold mb-4 text-sm flex items-center gap-2 shadow-sm">
                <span className="text-red-500">✗</span> {err}
              </div>
            )}

            <div className="grid md:grid-cols-4 gap-5">
              <Field label="Amount (₹)">
                <Input
                  type="number"
                  value={amt}
                  onChange={(e) => setAmt(e.target.value)}
                  placeholder="0.00"
                  min={0}
                  step={0.01}
                  className="shadow-inner"
                />
              </Field>
              <Field label="Paid on">
                <Input type="date" value={dt} onChange={(e) => setDt(e.target.value)} className="shadow-inner" />
              </Field>
              <div className="md:col-span-2">
                <Label>Mode</Label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {MODES.map((m) => (
                    <button
                      key={m.v}
                      type="button"
                      onClick={() => setMode(m.v)}
                      className={cn(
                        'px-4 py-2 text-sm font-semibold rounded-xl border transition-all shadow-sm',
                        mode === m.v
                          ? 'bg-foreground text-background border-foreground ring-1 ring-inset ring-foreground/20'
                          : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground',
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <Field label="Reference / Note (optional)">
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Txn ID, Cheque #, etc."
                className="shadow-inner"
              />
            </Field>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="primary"
                onClick={() => addMut.mutate()}
                disabled={addMut.isPending}
                className="shadow-md font-bold px-6"
              >
                {addMut.isPending ? 'Saving…' : '+ Record Payment'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Summary({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'ink' | 'postit' | 'leaf' | 'accent';
}) {
  const bg = {
    ink: 'bg-blue-50 text-blue-700 border-blue-100',
    postit: 'bg-amber-50 text-amber-700 border-amber-100',
    leaf: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    accent: 'bg-red-50 text-red-700 border-red-100',
  }[tone];
  return (
    <div className={cn('border rounded-2xl p-4 shadow-sm', bg)}>
      <div className="text-[10px] font-semibold uppercase tracking-widest opacity-80">{label}</div>
      <div className="font-mono font-bold text-2xl mt-1 tracking-tight">{value}</div>
    </div>
  );
}

function PaymentRow({
  row,
  onDelete,
  deleting,
}: {
  row: PartialPaymentRow;
  onDelete: () => void;
  deleting: boolean;
}) {
  const parts = (row.note || '').split(' · ');
  const mode = parts[0] || 'Payment';
  const ref = parts.slice(1).join(' · ');
  return (
    <tr className="hover:bg-muted/40 transition-colors group">
      <td className="px-4 py-3 font-medium text-foreground">{fmtShortDate(row.paid_on)}</td>
      <td className="px-4 py-3">
        <Badge tone="ink" className="text-[10px] font-semibold px-2 py-0.5 rounded-md border-blue-200 bg-blue-50">
          {mode}
        </Badge>
      </td>
      <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">{ref || '—'}</td>
      <td className="px-4 py-3 text-right font-mono font-bold text-foreground">{fmt(row.amount)}</td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          aria-label="Remove payment"
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
        >
          <Trash2 size={16} strokeWidth={2.5} />
        </button>
      </td>
    </tr>
  );
}
