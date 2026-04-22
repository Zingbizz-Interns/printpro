import { supabase } from '@/lib/supabase/client';
import { dbToJob } from '@/lib/domain/mappers';
import type {
  Job,
  JobItemRow,
  JobOrderRow,
  PartialPaymentRow,
} from '@/types/db';

/**
 * Load all jobs belonging to the current customer, newest first.
 * RLS enforces the customer_user_id filter server-side; the explicit
 * `.eq` here is defense-in-depth so the query fails closed (empty
 * result) if RLS is ever misconfigured.
 *
 * Partial payments are embedded so the ledger can show balances
 * without an N+1 fetch.
 */
export async function listMyJobs(customerUserId: string): Promise<Job[]> {
  const { data, error } = await supabase()
    .from('job_orders')
    .select('*, job_items(*), partial_payments(*)')
    .eq('customer_user_id', customerUserId)
    .order('job_no', { ascending: false });
  if (error) throw error;

  type Row = JobOrderRow & {
    job_items: JobItemRow[];
    partial_payments?: PartialPaymentRow[];
  };

  return ((data ?? []) as Row[]).map((row) => {
    const job = dbToJob(row);
    job._partialPayments = row.partial_payments ?? [];
    return job;
  });
}

/** Single job + items + partial payments for the current customer. */
export async function getMyJob(
  customerUserId: string,
  jobId: number,
): Promise<Job | null> {
  const { data, error } = await supabase()
    .from('job_orders')
    .select('*, job_items(*), partial_payments(*)')
    .eq('customer_user_id', customerUserId)
    .eq('id', jobId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  type Row = JobOrderRow & {
    job_items: JobItemRow[];
    partial_payments?: PartialPaymentRow[];
  };
  const row = data as Row;
  const job = dbToJob(row);
  job._partialPayments = row.partial_payments ?? [];
  return job;
}
