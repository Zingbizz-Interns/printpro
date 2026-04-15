import { supabase } from '@/lib/supabase/client';
import type { PartialPaymentRow, PaymentMode } from '@/types/db';

/** All partial payments for a job, ordered by paid_on (copy.html:4520, 5652). */
export async function listPaymentsForJob(jobId: number): Promise<PartialPaymentRow[]> {
  const { data, error } = await supabase()
    .from('partial_payments')
    .select('*')
    .eq('job_order_id', jobId)
    .order('paid_on');
  if (error) throw error;
  return (data ?? []) as PartialPaymentRow[];
}

/** Record a payment. `note` is stored as `"<mode> · <freeText>"` (copy.html:4569, 5685). */
export async function addPayment(args: {
  jobId: number;
  amount: number;
  paidOn: string;
  mode: PaymentMode;
  note?: string;
}): Promise<void> {
  const { jobId, amount, paidOn, mode, note } = args;
  const combined = mode + (note?.trim() ? ' · ' + note.trim() : '');
  const { error } = await supabase().from('partial_payments').insert({
    job_order_id: jobId,
    amount,
    paid_on: paidOn,
    note: combined,
  });
  if (error) throw error;
}

/** Delete a payment (copy.html:4581, 5696). */
export async function deletePayment(paymentId: number): Promise<void> {
  const { error } = await supabase()
    .from('partial_payments')
    .delete()
    .eq('id', paymentId);
  if (error) throw error;
}
