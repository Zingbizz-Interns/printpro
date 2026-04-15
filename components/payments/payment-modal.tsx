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
      size="lg"
      tilt="r"
      title={
        <span className="flex items-center gap-3">
          💳 Payments
          <span className="font-mono text-xl text-pencil/50">#{jobNo}</span>
        </span>
      }
      description={companyName || undefined}
    >
      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
        <div className="bg-amber-lt border-2 border-amber-sketch wobbly-sm px-4 py-2 text-amber-sketch text-sm font-bold">
          🔒 Payment history is visible to admin only. You can see the balance above.
        </div>
      )}

      {/* Payment list */}
      {isOwner && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-xl">History</h3>
            <Badge tone="muted" className="text-xs">
              {payments.length + (advancePaid > 0 ? 1 : 0)} entries
            </Badge>
          </div>

          <div className="hd-table">
            <table className="w-full text-left font-body text-sm">
              <thead className="bg-pencil text-white font-display">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Mode</th>
                  <th className="px-3 py-2">Note</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {advancePaid > 0 && (
                  <tr className="bg-leaf-lt/40 border-t border-dashed border-pencil/30">
                    <td className="px-3 py-2">initial</td>
                    <td className="px-3 py-2">
                      <Badge tone="leaf" className="text-xs">
                        ● advance
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-pencil/60 italic">captured with job</td>
                    <td className="px-3 py-2 text-right font-mono font-bold">{fmt(advancePaid)}</td>
                    <td />
                  </tr>
                )}

                {paymentsQ.isLoading && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-pencil/50 italic">
                      loading…
                    </td>
                  </tr>
                )}
                {!paymentsQ.isLoading && payments.length === 0 && advancePaid === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-pencil/60 italic">
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
        <div className="mt-2 p-4 bg-postit-lt border-2 border-dashed border-pencil/40 wobbly-sm space-y-3">
          <h3 className="font-display text-xl">+ Add a payment</h3>

          {err && (
            <div className="text-sm font-bold text-accent bg-accent-lt border border-accent wobbly-sm px-3 py-1.5">
              ✗ {err}
            </div>
          )}

          <div className="grid md:grid-cols-4 gap-3">
            <Field label="Amount (₹)">
              <Input
                type="number"
                value={amt}
                onChange={(e) => setAmt(e.target.value)}
                placeholder="0.00"
                min={0}
                step={0.01}
              />
            </Field>
            <Field label="Paid on">
              <Input type="date" value={dt} onChange={(e) => setDt(e.target.value)} />
            </Field>
            <div className="md:col-span-2">
              <Label>Mode</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {MODES.map((m) => (
                  <button
                    key={m.v}
                    type="button"
                    onClick={() => setMode(m.v)}
                    className={cn(
                      'px-3 py-1.5 text-sm font-bold border-2 wobbly-sm transition-all',
                      mode === m.v
                        ? 'bg-pencil text-white border-pencil shadow-hand-sm'
                        : 'bg-white text-pencil/70 border-dashed border-pencil/40 hover:border-solid',
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Field label="Reference / note (optional)">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="txn id, cheque #, etc."
            />
          </Field>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="primary"
              onClick={() => addMut.mutate()}
              disabled={addMut.isPending}
            >
              {addMut.isPending ? 'saving…' : '+ record payment'}
            </Button>
          </div>
        </div>
      )}
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
    ink: 'bg-ink-lt text-ink',
    postit: 'bg-postit text-pencil',
    leaf: 'bg-leaf-lt text-leaf',
    accent: 'bg-accent-lt text-accent',
  }[tone];
  return (
    <div className={`${bg} border-2 border-pencil wobbly-sm px-3 py-2 shadow-hand-soft`}>
      <div className="text-xs font-display uppercase tracking-wide opacity-70">{label}</div>
      <div className="font-mono font-bold text-lg mt-0.5">{value}</div>
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
    <tr className="border-t border-dashed border-pencil/30 hover:bg-postit/40">
      <td className="px-3 py-2">{fmtShortDate(row.paid_on)}</td>
      <td className="px-3 py-2">
        <Badge tone="ink" className="text-xs">
          {mode}
        </Badge>
      </td>
      <td className="px-3 py-2 text-pencil/70">{ref || '—'}</td>
      <td className="px-3 py-2 text-right font-mono font-bold">{fmt(row.amount)}</td>
      <td className="px-3 py-2">
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          aria-label="Remove payment"
          className="kb-action wobbly-sm kb-action-danger"
        >
          <Trash2 size={12} strokeWidth={2.5} />
        </button>
      </td>
    </tr>
  );
}
