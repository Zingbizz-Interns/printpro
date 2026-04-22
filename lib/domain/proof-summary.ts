import type { Job, JobItem, ProofReview } from '@/types/db';
import { currentReviewFor } from '@/lib/db/proof-reviews';

export type ItemProofState =
  | 'none'          // no image uploaded
  | 'pending'       // proof uploaded, no current review
  | 'approved'      // current review is approved
  | 'changes';      // current review is changes_requested

export interface ProofSummary {
  pending: number;
  approved: number;
  changes: number;
  total: number;     // count of items with image_url
}

export function itemProofState(item: JobItem, reviews: ProofReview[]): ItemProofState {
  if (!item.imageUrl) return 'none';
  const current = currentReviewFor(reviews, item);
  if (!current) {
    if (item.designStatus === 'Design - Approved') return 'approved';
    return 'pending';
  }
  return current.decision === 'approved' ? 'approved' : 'changes';
}

export function summarizeJobProofs(job: Job, reviews: ProofReview[]): ProofSummary {
  const s: ProofSummary = { pending: 0, approved: 0, changes: 0, total: 0 };
  for (const it of job.items) {
    const state = itemProofState(it, reviews);
    if (state === 'none') continue;
    s.total += 1;
    if (state === 'approved') s.approved += 1;
    else if (state === 'changes') s.changes += 1;
    else s.pending += 1;
  }
  return s;
}
