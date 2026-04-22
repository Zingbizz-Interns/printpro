import { supabase } from '@/lib/supabase/client';
import type { PendingJobItemInput } from '@/types/db';

export interface CreatePendingJobArgs {
  items: PendingJobItemInput[];
  notes?: string;
  source: 'quote' | 'reorder';
  originalJobId?: number | null;
  deliveryDate?: string | null;
}

/**
 * Calls the server-side `create_pending_job` RPC. The server is the
 * authority on rate / discount / status / job_no — the client only
 * describes *what* the customer wants, never *how much* it'll cost.
 *
 * Returns the new `job_orders.id`. Throws with a friendly message on
 * rate-limit (`rate_limited:`) and with the raw Postgres error
 * otherwise.
 */
export async function createPendingJob(args: CreatePendingJobArgs): Promise<number> {
  const { data, error } = await supabase().rpc('create_pending_job', {
    p_items: args.items,
    p_notes: args.notes ?? '',
    p_source: args.source,
    p_original_job_id: args.originalJobId ?? null,
    p_delivery_date: args.deliveryDate ?? null,
  });
  if (error) {
    if (error.message?.startsWith('rate_limited:')) {
      throw new Error(error.message.replace(/^rate_limited:\s*/, ''));
    }
    throw error;
  }
  return Number(data);
}
