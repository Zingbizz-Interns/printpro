'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Star, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/auth/store';
import { listAllFeedback, summarize } from '@/lib/db/feedback';
import { cn } from '@/lib/utils';

type RatingFilter = 'all' | 'low'; // low = ≤ 3

const PAGE_SIZE = 25;

function fmtDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function DashboardFeedbackPage() {
  const router = useRouter();
  const isOwner = useAuthStore((s) => s.isOwner());

  useEffect(() => {
    if (!isOwner) router.replace('/kanban');
  }, [isOwner, router]);

  const q = useQuery({
    queryKey: ['dashboard-feedback'],
    queryFn: listAllFeedback,
  });

  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const all = q.data ?? [];
    if (ratingFilter === 'low') return all.filter((f) => f.rating <= 3);
    return all;
  }, [q.data, ratingFilter]);

  const summary = summarize(filtered);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pages);
  const paged = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  useEffect(() => {
    // Reset to page 1 when filters change.
    setPage(1);
  }, [ratingFilter]);

  if (!isOwner) return null;

  return (
    <main className="px-4 sm:px-8 py-8 space-y-8 max-w-[1400px] mx-auto">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Dashboard
        </Link>
      </div>

      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-body font-bold text-foreground tracking-tight">
            Customer Feedback
          </h1>
          <p className="mt-1 text-muted-foreground">
            {summary.count} response{summary.count === 1 ? '' : 's'}
            {summary.count > 0 && ` · avg ${summary.averageRating.toFixed(1)} / 5`}
          </p>
        </div>
        <div className="flex gap-2">
          <FilterChip
            active={ratingFilter === 'all'}
            onClick={() => setRatingFilter('all')}
            label="All ratings"
          />
          <FilterChip
            active={ratingFilter === 'low'}
            onClick={() => setRatingFilter('low')}
            label="≤ 3 (needs follow-up)"
            accent
          />
        </div>
      </div>

      {q.isLoading ? (
        <div className="py-16 text-center text-muted-foreground animate-pulse">Loading…</div>
      ) : paged.length === 0 ? (
        <Card>
          <CardBody className="py-16 text-center text-muted-foreground">
            {ratingFilter === 'low'
              ? 'No low-rated feedback. Good work.'
              : 'No feedback yet. Customers are prompted ~1 hour after a job is delivered.'}
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto border border-border rounded-2xl bg-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground font-semibold uppercase tracking-wider text-[10px] border-b border-border">
                <tr>
                  <th className="px-5 py-3">Job</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Rating</th>
                  <th className="px-5 py-3">Comment</th>
                  <th className="px-5 py-3">Recommend</th>
                  <th className="px-5 py-3">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.map((f) => (
                  <tr key={f.id} className="hover:bg-muted/40 transition-colors align-top">
                    <td className="px-5 py-4 font-mono font-bold text-foreground whitespace-nowrap">
                      <Link
                        href={`/jobs/${f.jobOrderId}`}
                        className="hover:text-blue-600 transition-colors"
                      >
                        #{f.jobNo}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium truncate max-w-[200px]" title={f.companyName}>
                        {f.companyName || '—'}
                      </div>
                      {f.customerName && (
                        <div className="text-xs text-muted-foreground truncate">
                          {f.customerName}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            size={14}
                            className={
                              n <= f.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-muted-foreground/40'
                            }
                          />
                        ))}
                      </div>
                      {f.rating <= 3 && (
                        <Badge tone="accent" className="mt-1 text-[10px]">
                          Needs follow-up
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-4 max-w-[420px]">
                      {f.comment ? (
                        <p className="text-sm whitespace-pre-wrap">{f.comment}</p>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          No comment
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {f.wouldRecommend === true ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-sm">
                          <ThumbsUp size={13} /> Yes
                        </span>
                      ) : f.wouldRecommend === false ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 text-sm">
                          <ThumbsDown size={13} /> No
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground whitespace-nowrap">
                      {fmtDate(f.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-muted-foreground">
                Page {clampedPage} of {pages}
              </div>
              <div className="flex gap-2">
                <PagerButton disabled={clampedPage <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </PagerButton>
                <PagerButton disabled={clampedPage >= pages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </PagerButton>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 text-sm font-semibold rounded-xl border transition-all shadow-sm',
        active
          ? accent
            ? 'bg-red-600 text-white border-red-600 ring-1 ring-inset ring-red-600/30'
            : 'bg-foreground text-white border-foreground ring-1 ring-inset ring-foreground/20'
          : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}

function PagerButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="px-3 py-1.5 text-sm font-medium border border-border rounded-lg bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}
