import { supabase } from '@/lib/supabase/client';
import type { Job, JobItemRow, JobOrderRow } from '@/types/db';
import { dbToJob, itemToDb, jobToDb } from '@/lib/domain/mappers';

/** Load all jobs with items nested (copy.html:2564). */
export async function listJobs(): Promise<Job[]> {
  const { data, error } = await supabase()
    .from('job_orders')
    .select('*, job_items(*)')
    .order('job_no', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as (JobOrderRow & { job_items: JobItemRow[] })[]).map(dbToJob);
}

/**
 * Next job number. Tries RPC `get_next_job_no` first, falls back to
 * max(job_no) + 1 (copy.html:4621-4629).
 */
export async function nextJobNo(): Promise<number> {
  const sb = supabase();
  const rpc = await sb.rpc('get_next_job_no');
  if (!rpc.error && rpc.data != null) return Number(rpc.data);

  const { data: maxRow } = await sb
    .from('job_orders')
    .select('job_no')
    .order('job_no', { ascending: false })
    .limit(1);
  const max = maxRow && maxRow.length > 0 ? Number((maxRow[0] as { job_no: number }).job_no) : 0;
  return max + 1;
}

/**
 * Insert a brand-new order + its items in sequence.
 * Returns the saved Job with server-assigned ids.
 * Ports saveDraftNow (copy.html:4616-4652) and the insert branch of
 * saveNow (copy.html:4672-4690).
 */
export async function insertJob(
  j: Job,
  createdByFallback?: string,
  createdByIdFallback?: string | null,
): Promise<Job> {
  const sb = supabase();

  const { data: newOrder, error: orderErr } = await sb
    .from('job_orders')
    .insert(jobToDb(j, createdByFallback, createdByIdFallback))
    .select()
    .single();
  if (orderErr || !newOrder) throw orderErr ?? new Error('insert returned no row');

  const orderId = (newOrder as JobOrderRow).id;
  let insertedItems: JobItemRow[] = [];

  if (j.items.length) {
    const rows = j.items.map((it, i) => itemToDb(it, orderId, i));
    const { data: newItems, error: itemErr } = await sb
      .from('job_items')
      .insert(rows)
      .select();
    if (itemErr) throw itemErr;
    insertedItems = (newItems ?? []) as JobItemRow[];
  }

  return dbToJob({ ...(newOrder as JobOrderRow), job_items: insertedItems });
}

/**
 * Update an existing order: UPDATE the order row, then DELETE all
 * its items and re-INSERT. Simple full replacement (copy.html:4693-4701).
 */
export async function updateJob(j: Job): Promise<Job> {
  if (typeof j.id !== 'number') throw new Error('updateJob requires a numeric id');
  const sb = supabase();

  const { error: orderErr } = await sb
    .from('job_orders')
    .update(jobToDb(j))
    .eq('id', j.id);
  if (orderErr) throw orderErr;

  const { error: delErr } = await sb.from('job_items').delete().eq('job_order_id', j.id);
  if (delErr) throw delErr;

  let insertedItems: JobItemRow[] = [];
  if (j.items.length) {
    const rows = j.items.map((it, i) => itemToDb(it, j.id as number, i));
    const { data: newItems, error: itemErr } = await sb
      .from('job_items')
      .insert(rows)
      .select();
    if (itemErr) throw itemErr;
    insertedItems = (newItems ?? []) as JobItemRow[];
  }

  return { ...j, items: insertedItems.map((r, i) => ({ ...j.items[i], id: r.id })), _dirty: false } as Job;
}

/** Delete job + cascade items via FK (copy.html:3258, 4659). */
export async function deleteJob(id: number): Promise<void> {
  const { error } = await supabase().from('job_orders').delete().eq('id', id);
  if (error) throw error;
}

/** Auto-update payment_status only (copy.html:4558). */
export async function setPaymentStatus(
  id: number,
  payment_status: Job['paymentStatus'],
): Promise<void> {
  const { error } = await supabase()
    .from('job_orders')
    .update({ payment_status })
    .eq('id', id);
  if (error) throw error;
}

/** Auto-update job_status only (copy.html:4605). */
export async function setJobStatus(id: number, job_status: Job['jobStatus']): Promise<void> {
  const { error } = await supabase()
    .from('job_orders')
    .update({ job_status })
    .eq('id', id);
  if (error) throw error;
}
