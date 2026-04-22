import { supabase } from '@/lib/supabase/client';
import type {
  JobFeedback,
  JobFeedbackRow,
  JobFeedbackWithContext,
} from '@/types/db';

const FEEDBACK_EDIT_WINDOW_DAYS = 14;

function rowToFeedback(r: JobFeedbackRow): JobFeedback {
  return {
    id: r.id,
    jobOrderId: r.job_order_id,
    customerUserId: r.customer_user_id,
    rating: r.rating,
    comment: r.comment ?? '',
    wouldRecommend: r.would_recommend,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** True if the feedback can still be edited client-side. RLS enforces
 *  the same window on writes, so this is just for UI affordances. */
export function isFeedbackEditable(f: Pick<JobFeedback, 'createdAt'>): boolean {
  const created = Date.parse(f.createdAt);
  if (Number.isNaN(created)) return false;
  const age = Date.now() - created;
  return age < FEEDBACK_EDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

/** Fetch the customer's own feedback for a job. Null when they haven't
 *  rated yet. RLS scopes to the signed-in user. */
export async function getMyFeedback(jobOrderId: number): Promise<JobFeedback | null> {
  const { data, error } = await supabase()
    .from('job_feedback')
    .select('*')
    .eq('job_order_id', jobOrderId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToFeedback(data as JobFeedbackRow) : null;
}

export interface FeedbackInput {
  jobOrderId: number;
  customerUserId: string;
  rating: number;
  comment: string;
  wouldRecommend: boolean | null;
}

export async function submitFeedback(input: FeedbackInput): Promise<JobFeedback> {
  const { data, error } = await supabase()
    .from('job_feedback')
    .insert({
      job_order_id: input.jobOrderId,
      customer_user_id: input.customerUserId,
      rating: input.rating,
      comment: input.comment,
      would_recommend: input.wouldRecommend,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToFeedback(data as JobFeedbackRow);
}

export async function updateFeedback(
  id: number,
  patch: {
    rating: number;
    comment: string;
    wouldRecommend: boolean | null;
  },
): Promise<JobFeedback> {
  const { data, error } = await supabase()
    .from('job_feedback')
    .update({
      rating: patch.rating,
      comment: patch.comment,
      would_recommend: patch.wouldRecommend,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return rowToFeedback(data as JobFeedbackRow);
}

/**
 * Staff-only: list every feedback row with the minimal job + customer
 * context the dashboard needs. Ordered newest-first.
 */
export async function listAllFeedback(): Promise<JobFeedbackWithContext[]> {
  const { data, error } = await supabase()
    .from('job_feedback')
    .select(
      `
        *,
        job_orders (job_no, company_name),
        customer_profiles (name)
      `,
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  type Joined = JobFeedbackRow & {
    job_orders: { job_no: number; company_name: string } | null;
    customer_profiles: { name: string } | null;
  };
  return ((data ?? []) as Joined[]).map((r) => ({
    ...rowToFeedback(r),
    jobNo: r.job_orders?.job_no ?? 0,
    companyName: r.job_orders?.company_name ?? '',
    customerName: r.customer_profiles?.name ?? '',
  }));
}

export interface FeedbackSummary {
  count: number;
  averageRating: number;
  lowRatingCount: number; // <= 3
}

export function summarize(rows: { rating: number }[]): FeedbackSummary {
  if (rows.length === 0) {
    return { count: 0, averageRating: 0, lowRatingCount: 0 };
  }
  const total = rows.reduce((s, r) => s + r.rating, 0);
  const low = rows.filter((r) => r.rating <= 3).length;
  return {
    count: rows.length,
    averageRating: total / rows.length,
    lowRatingCount: low,
  };
}
