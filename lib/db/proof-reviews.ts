import { supabase } from '@/lib/supabase/client';
import type {
  ProofDecision,
  ProofReview,
  ProofReviewRow,
} from '@/types/db';

function rowToReview(r: ProofReviewRow): ProofReview {
  return {
    id: r.id,
    jobItemId: r.job_item_id,
    customerUserId: r.customer_user_id,
    decision: r.decision,
    comment: r.comment ?? '',
    createdAt: r.created_at,
  };
}

/**
 * List every proof review for items that belong to the given job.
 * Returns oldest → newest so callers can fold them per-item.
 *
 * RLS ensures a customer session only sees rows under their own
 * account; a staff session sees all. The app-layer `customerUserId`
 * filter is defence-in-depth for portal use; staff callers pass null
 * to skip it.
 */
export async function listReviewsForJob(
  jobId: number,
  customerUserId: string | null,
): Promise<ProofReview[]> {
  const sb = supabase();

  const { data: itemRows, error: itemsErr } = await sb
    .from('job_items')
    .select('id')
    .eq('job_order_id', jobId);
  if (itemsErr) throw itemsErr;
  const ids = (itemRows ?? []).map((r) => (r as { id: number }).id);
  if (!ids.length) return [];

  let q = sb
    .from('proof_reviews')
    .select('*')
    .in('job_item_id', ids)
    .order('created_at', { ascending: true });
  if (customerUserId) q = q.eq('customer_user_id', customerUserId);

  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as ProofReviewRow[]).map(rowToReview);
}

/** Submit a proof decision. RLS enforces that the customer owns the item. */
export async function submitProofReview(args: {
  jobItemId: number;
  customerUserId: string;
  decision: ProofDecision;
  comment: string;
}): Promise<ProofReview> {
  const { data, error } = await supabase()
    .from('proof_reviews')
    .insert({
      job_item_id: args.jobItemId,
      customer_user_id: args.customerUserId,
      decision: args.decision,
      comment: args.comment,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToReview(data as ProofReviewRow);
}

/**
 * Load every proof review in the system (staff-only — customers are
 * blocked by RLS from seeing other customers' rows). Useful for the
 * staff kanban to compute per-job "awaiting approval / changes
 * requested / approved" badges in one shot.
 */
export async function listAllReviews(): Promise<ProofReview[]> {
  const { data, error } = await supabase()
    .from('proof_reviews')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as ProofReviewRow[]).map(rowToReview);
}

/**
 * The review that a customer is currently reacting to — i.e. the most
 * recent review whose `created_at >= proofUploadedAt`. Returns `null`
 * when the proof is new and has no decision yet.
 */
export function currentReviewFor(
  reviews: ProofReview[],
  item: { id: number | string; proofUploadedAt: string | null },
): ProofReview | null {
  if (typeof item.id !== 'number') return null;
  const cutoff = item.proofUploadedAt ? Date.parse(item.proofUploadedAt) : 0;
  const relevant = reviews
    .filter((r) => r.jobItemId === item.id && Date.parse(r.createdAt) >= cutoff - 1000)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return relevant[0] ?? null;
}
