'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, RotateCw } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/card';
import { listReviewsForJob } from '@/lib/db/proof-reviews';
import type { Job } from '@/types/db';

/**
 * Staff-side read-only history of every proof review on a job's items.
 * Empty state renders nothing — the section only appears once at least
 * one review exists.
 */
export function StaffProofHistory({ job }: { job: Job }) {
  const jobId = typeof job.id === 'number' ? job.id : null;

  const reviewsQ = useQuery({
    queryKey: ['staff-job-reviews', jobId],
    queryFn: () => listReviewsForJob(jobId!, null),
    enabled: jobId != null,
  });

  const grouped = useMemo(() => {
    const reviews = reviewsQ.data ?? [];
    const byItem = new Map<number, typeof reviews>();
    for (const r of reviews) {
      const arr = byItem.get(r.jobItemId) ?? [];
      arr.push(r);
      byItem.set(r.jobItemId, arr);
    }
    return byItem;
  }, [reviewsQ.data]);

  if (!jobId || !reviewsQ.data || reviewsQ.data.length === 0) return null;

  return (
    <Card>
      <CardBody className="p-5 space-y-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
            Proof reviews
          </div>
          <div className="font-body font-semibold text-lg mt-0.5">
            Customer decisions on uploaded proofs
          </div>
        </div>
        <ul className="space-y-4">
          {job.items.map((it) => {
            if (typeof it.id !== 'number') return null;
            const reviews = (grouped.get(it.id) ?? []).slice().sort((a, b) =>
              b.createdAt.localeCompare(a.createdAt),
            );
            if (!reviews.length) return null;
            const descParts = [it.category, it.description, it.size, it.material, it.finishing].filter(Boolean);
            return (
              <li key={it.id} className="rounded-xl border border-border p-4">
                <div className="font-medium">{descParts[0] || `Item #${it.id}`}</div>
                {descParts.length > 1 && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {descParts.slice(1).join(' · ')}
                  </div>
                )}
                <ul className="mt-3 space-y-2">
                  {reviews.map((r) => {
                    const historical =
                      it.proofUploadedAt && Date.parse(r.createdAt) < Date.parse(it.proofUploadedAt) - 1000;
                    return (
                      <li
                        key={r.id}
                        className={`rounded-lg px-3 py-2 text-sm ${
                          historical ? 'bg-muted/30 text-muted-foreground' : 'bg-muted/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 font-semibold">
                            {r.decision === 'approved' ? (
                              <>
                                <Check size={13} className="text-emerald-600" /> Approved
                              </>
                            ) : (
                              <>
                                <RotateCw size={13} className="text-amber-600" /> Changes requested
                              </>
                            )}
                            {historical && (
                              <span className="ml-1 text-[10px] font-mono uppercase tracking-widest opacity-70">
                                (superseded)
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(r.createdAt).toLocaleString('en-IN')}
                          </span>
                        </div>
                        {r.comment && (
                          <div className="mt-1 whitespace-pre-wrap text-xs">{r.comment}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}
