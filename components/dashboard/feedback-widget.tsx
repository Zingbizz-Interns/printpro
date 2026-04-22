'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Star, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { listAllFeedback, summarize } from '@/lib/db/feedback';

/**
 * Owner-dashboard surface for customer feedback. Shows avg rating,
 * count, and a low-rating warning with a deep link to the full list.
 * Avoids adding a 9th tile to the stats grid by rendering as its own
 * section.
 */
export function FeedbackWidget() {
  const q = useQuery({
    queryKey: ['dashboard-feedback'],
    queryFn: listAllFeedback,
  });

  const all = q.data ?? [];
  const last30 = all.filter(
    (f) => Date.parse(f.createdAt) >= Date.now() - 30 * 24 * 60 * 60 * 1000,
  );
  const summary30 = summarize(last30);
  const summaryAll = summarize(all);
  const latest = all.slice(0, 3);

  return (
    <section>
      <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
        <h2 className="text-2xl font-body font-bold text-foreground tracking-tight flex items-center gap-3">
          Customer Feedback
          <Badge tone="muted" className="text-xs font-semibold py-1">
            {summaryAll.count} total
          </Badge>
          {summary30.lowRatingCount > 0 && (
            <Badge tone="accent" className="text-xs font-semibold py-1">
              {summary30.lowRatingCount} need follow-up
            </Badge>
          )}
        </h2>
        <Link
          href="/dashboard/feedback"
          className="text-sm font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          See all <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <SummaryCard
          label="Last 30 days"
          avg={summary30.averageRating}
          count={summary30.count}
        />
        <SummaryCard
          label="All time"
          avg={summaryAll.averageRating}
          count={summaryAll.count}
        />
        <div className="border border-border rounded-2xl bg-card p-5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Recent
          </div>
          {latest.length === 0 ? (
            <div className="mt-4 text-sm text-muted-foreground">
              No feedback yet. Customers are prompted ~1 hour after delivery.
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {latest.map((f) => (
                <li key={f.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <Stars value={f.rating} />
                    <span className="text-xs text-muted-foreground">
                      #{f.jobNo} · {f.companyName || f.customerName || '—'}
                    </span>
                  </div>
                  {f.comment && (
                    <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {f.comment}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  avg,
  count,
}: {
  label: string;
  avg: number;
  count: number;
}) {
  const display = count > 0 ? avg.toFixed(1) : '—';
  return (
    <div className="border border-border rounded-2xl bg-card p-5 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-3">
        <div className="font-mono font-bold text-4xl tracking-tight">{display}</div>
        <div className="text-sm text-muted-foreground">
          / 5 · {count} response{count === 1 ? '' : 's'}
        </div>
      </div>
      {count > 0 && (
        <div className="mt-3">
          <Stars value={Math.round(avg)} />
        </div>
      )}
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          className={
            n <= value
              ? 'fill-amber-400 text-amber-400'
              : 'text-muted-foreground/40'
          }
        />
      ))}
    </span>
  );
}
