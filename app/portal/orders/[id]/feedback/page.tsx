'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Loader2, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/portal/star-rating';
import { useCustomerAuthStore } from '@/lib/auth/customer-store';
import { getMyJob } from '@/lib/db/portal-orders';
import {
  getMyFeedback,
  isFeedbackEditable,
  submitFeedback,
  updateFeedback,
} from '@/lib/db/feedback';
import type { JobFeedback } from '@/types/db';

function fmtDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const jobId = Number(id);
  const user = useCustomerAuthStore((s) => s.currentUser);
  const qc = useQueryClient();

  const jobQ = useQuery({
    queryKey: ['portal-job', jobId, user?.id],
    queryFn: () => getMyJob(user!.id, jobId),
    enabled: Boolean(user?.id) && Number.isFinite(jobId),
  });

  const feedbackQ = useQuery({
    queryKey: ['portal-feedback', jobId, user?.id],
    queryFn: () => getMyFeedback(jobId),
    enabled: Boolean(user?.id) && Number.isFinite(jobId),
  });

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState(false);

  // Seed the form from the existing feedback once it loads.
  const existing = feedbackQ.data ?? null;
  useEffect(() => {
    if (existing) {
      setRating(existing.rating);
      setComment(existing.comment);
      setWouldRecommend(existing.wouldRecommend);
    }
  }, [existing]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('not signed in');
      if (rating < 1 || rating > 5) throw new Error('Please pick a star rating.');
      if (existing) {
        return updateFeedback(existing.id, {
          rating,
          comment: comment.trim(),
          wouldRecommend,
        });
      }
      return submitFeedback({
        jobOrderId: jobId,
        customerUserId: user.id,
        rating,
        comment: comment.trim(),
        wouldRecommend,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-feedback', jobId, user?.id] });
      setSavedTick(true);
      setError(null);
      setTimeout(() => setSavedTick(false), 2000);
    },
    onError: (e) => setError((e as Error).message || 'Could not save your feedback.'),
  });

  if (jobQ.isLoading || feedbackQ.isLoading) {
    return (
      <div className="py-16 text-center text-muted-foreground animate-pulse">Loading…</div>
    );
  }

  const job = jobQ.data;
  if (!job) {
    return (
      <div className="max-w-xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardBody className="py-10 text-center">
            <h2 className="font-body font-semibold text-xl text-red-600">Order not found</h2>
            <p className="mt-2 text-sm text-red-600/80">
              We couldn&apos;t find job #{id} on your account.
            </p>
            <Link href="/portal/orders" className="mt-6 inline-block">
              <Button variant="outline" size="sm">
                <ArrowLeft size={14} /> Back to orders
              </Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (job.jobStatus !== 'Delivered') {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <BackLink jobId={jobId} />
        <Card tone="muted" className="border-dashed">
          <CardBody className="py-10 text-center text-sm text-muted-foreground">
            You can rate a job once it&apos;s marked delivered.
          </CardBody>
        </Card>
      </div>
    );
  }

  const editable = existing ? isFeedbackEditable(existing) : true;

  return (
    <div className="space-y-6 max-w-2xl">
      <BackLink jobId={jobId} />

      <div>
        <div className="font-mono text-xs text-muted-foreground">
          Feedback for job #{job.jobNo}
        </div>
        <h1 className="mt-0.5 font-display text-3xl tracking-tight">
          {existing ? 'Your rating' : 'How did we do?'}
        </h1>
        {existing && (
          <p className="mt-1 text-sm text-muted-foreground">
            Submitted {fmtDate(existing.createdAt)}.
            {editable
              ? ' You can edit this for 14 days.'
              : ' The 14-day edit window has closed.'}
          </p>
        )}
      </div>

      {!editable && existing ? (
        <ReadOnlyFeedback feedback={existing} />
      ) : (
        <Card>
          <CardBody className="space-y-6 p-6">
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Rating
              </label>
              <div className="mt-2">
                <StarRating value={rating} onChange={setRating} size="lg" />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Comments (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="What worked? What could we do better?"
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              />
            </div>

            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Would you recommend us?
              </label>
              <div className="mt-2 flex gap-2">
                <RecommendButton
                  active={wouldRecommend === true}
                  onClick={() => setWouldRecommend(wouldRecommend === true ? null : true)}
                  tone="yes"
                />
                <RecommendButton
                  active={wouldRecommend === false}
                  onClick={() => setWouldRecommend(wouldRecommend === false ? null : false)}
                  tone="no"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => save.mutate()}
                disabled={save.isPending || rating < 1}
              >
                {save.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Saving…
                  </>
                ) : existing ? (
                  'Update feedback'
                ) : (
                  'Submit feedback'
                )}
              </Button>
              {savedTick && (
                <span className="inline-flex items-center gap-1 text-sm text-emerald-700">
                  <Check size={14} /> Thanks!
                </span>
              )}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function BackLink({ jobId }: { jobId: number }) {
  return (
    <div>
      <Link
        href={`/portal/orders/${jobId}`}
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        <ArrowLeft size={14} /> Back to order
      </Link>
    </div>
  );
}

function ReadOnlyFeedback({ feedback }: { feedback: JobFeedback }) {
  return (
    <Card>
      <CardBody className="space-y-4 p-6">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Rating
          </div>
          <div className="mt-2">
            <StarRating value={feedback.rating} size="lg" readOnly />
          </div>
        </div>
        {feedback.comment && (
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Your comments
            </div>
            <p className="mt-2 text-sm whitespace-pre-wrap">{feedback.comment}</p>
          </div>
        )}
        {feedback.wouldRecommend !== null && (
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Would recommend
            </div>
            <div className="mt-2 text-sm">
              {feedback.wouldRecommend ? (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <ThumbsUp size={14} /> Yes
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-700">
                  <ThumbsDown size={14} /> No
                </span>
              )}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function RecommendButton({
  active,
  onClick,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  tone: 'yes' | 'no';
}) {
  const label = tone === 'yes' ? 'Yes' : 'No';
  const activeCls =
    tone === 'yes'
      ? 'bg-emerald-600 text-white border-emerald-600'
      : 'bg-amber-600 text-white border-amber-600';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
        active ? activeCls : 'bg-card border-border text-foreground hover:bg-muted/50'
      }`}
    >
      {tone === 'yes' ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />}
      {label}
    </button>
  );
}
