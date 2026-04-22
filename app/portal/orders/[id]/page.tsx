'use client';

import Link from 'next/link';
import { use, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  FileText,
  ImageOff,
  MessageSquare,
  RotateCw,
  Star,
} from 'lucide-react';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/portal/status-pill';
import { StarRating } from '@/components/portal/star-rating';
import { DownloadInvoiceButton } from '@/components/portal/download-invoice-button';
import { ProofReviewModal } from '@/components/portal/proof-review-modal';
import { ReorderModal } from '@/components/portal/reorder-modal';
import { useCustomerAuthStore } from '@/lib/auth/customer-store';
import { getMyJob } from '@/lib/db/portal-orders';
import { listReviewsForJob, currentReviewFor } from '@/lib/db/proof-reviews';
import { getMyFeedback, isFeedbackEditable } from '@/lib/db/feedback';
import {
  fmt,
  getTotalPaid,
  itemsSubtotal,
  jobGrandTotal,
} from '@/lib/domain/totals';
import type { JobFeedback, JobItem, ProofReview } from '@/types/db';

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

type ProofState =
  | { kind: 'none' }
  | { kind: 'pending' }
  | { kind: 'approved'; at: string }
  | { kind: 'changes_requested'; comment: string; at: string };

function proofStateFor(item: JobItem, reviews: ProofReview[]): ProofState {
  if (!item.imageUrl) return { kind: 'none' };
  const current = currentReviewFor(reviews, item);
  if (!current) {
    // Items approved offline (pre-Phase 2 or via staff edit) have
    // design_status flipped without a review row — trust the status
    // so the customer isn't prompted to re-approve.
    if (item.designStatus === 'Design - Approved') {
      return { kind: 'approved', at: '' };
    }
    return { kind: 'pending' };
  }
  if (current.decision === 'approved') {
    return { kind: 'approved', at: current.createdAt };
  }
  return {
    kind: 'changes_requested',
    comment: current.comment,
    at: current.createdAt,
  };
}

export default function PortalOrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const jobId = Number(id);
  const user = useCustomerAuthStore((s) => s.currentUser);
  const qc = useQueryClient();
  const [reviewingItem, setReviewingItem] = useState<JobItem | null>(null);
  const [reorderOpen, setReorderOpen] = useState(false);

  const jobQ = useQuery({
    queryKey: ['portal-job', jobId, user?.id],
    queryFn: () => getMyJob(user!.id, jobId),
    enabled: Boolean(user?.id) && Number.isFinite(jobId),
  });

  const reviewsQ = useQuery({
    queryKey: ['portal-job-reviews', jobId, user?.id],
    queryFn: () => listReviewsForJob(jobId, user!.id),
    enabled: Boolean(user?.id) && Number.isFinite(jobId),
  });

  const feedbackQ = useQuery({
    queryKey: ['portal-feedback', jobId, user?.id],
    queryFn: () => getMyFeedback(jobId),
    enabled: Boolean(user?.id) && Number.isFinite(jobId) && jobQ.data?.jobStatus === 'Delivered',
  });

  const reviews = reviewsQ.data ?? [];
  const reviewingHistory = useMemo(() => {
    if (!reviewingItem || typeof reviewingItem.id !== 'number') return [] as ProofReview[];
    const id = reviewingItem.id;
    return reviews.filter((r) => r.jobItemId === id);
  }, [reviewingItem, reviews]);

  if (jobQ.isLoading) {
    return <div className="py-16 text-center text-muted-foreground animate-pulse">Loading job…</div>;
  }

  if (jobQ.isError || !jobQ.data) {
    return (
      <div className="max-w-xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardBody className="py-10 text-center">
            <h2 className="font-body font-semibold text-xl text-red-600">Order not found</h2>
            <p className="mt-2 text-sm text-red-600/80">
              We couldn&apos;t find job #{id} on your account. If you think this is an error,
              contact us.
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

  const job = jobQ.data;
  const subtotal = itemsSubtotal(job.items);
  const discount = subtotal * ((job.discountPct || 0) / 100);
  const afterDisc = subtotal - discount;
  const gst = job.gstEnabled ? afterDisc * 0.18 : 0;
  const total = jobGrandTotal(job);
  const paid = getTotalPaid(job);
  const balance = Math.max(total - paid, 0);
  const partials = job._partialPayments ?? [];

  function handleSubmitted() {
    qc.invalidateQueries({ queryKey: ['portal-job-reviews', jobId, user?.id] });
    qc.invalidateQueries({ queryKey: ['portal-job', jobId, user?.id] });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/portal/orders"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft size={14} /> All orders
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-xs text-muted-foreground">Job</div>
          <h1 className="mt-0.5 font-display text-3xl tracking-tight">#{job.jobNo}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={14} /> Ordered {fmtDate(job.orderDate)}
            </span>
            {job.deliveryDate && (
              <span className="inline-flex items-center gap-1.5">
                <Clock size={14} /> Delivery {fmtDate(job.deliveryDate)}
                {job.deliveryTime ? ` · ${job.deliveryTime}` : ''}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill status={job.jobStatus} />
          {job.jobStatus === 'Delivered' && job.items.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setReorderOpen(true)}>
              <RotateCw size={14} /> Reorder
            </Button>
          )}
          <DownloadInvoiceButton job={job} />
        </div>
      </div>

      <Card>
        <CardBody className="p-0">
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                  <th className="px-4 py-3 w-10">#</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Proof</th>
                </tr>
              </thead>
              <tbody>
                {job.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      No items on this order yet.
                    </td>
                  </tr>
                ) : (
                  job.items.map((it, idx) => {
                    const q = Number(it.quantity) || 0;
                    const r = Number(it.rate) || 0;
                    const line = q * r;
                    const descParts = [it.category, it.description, it.size, it.material, it.finishing].filter(Boolean);
                    const state = proofStateFor(it, reviews);
                    return (
                      <tr key={it.id} className="border-b border-border last:border-b-0 align-top">
                        <td className="px-4 py-3 font-mono text-muted-foreground">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{descParts[0] || '—'}</div>
                          {descParts.length > 1 && (
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {descParts.slice(1).join(' · ')}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">{q || '—'} {it.unit || ''}</td>
                        <td className="px-4 py-3 text-right">{fmt(r)}</td>
                        <td className="px-4 py-3 text-right font-medium">{fmt(line)}</td>
                        <td className="px-4 py-3">
                          <ProofCell
                            state={state}
                            onReview={() => setReviewingItem(it)}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile items list */}
          <ul className="md:hidden divide-y divide-border">
            {job.items.length === 0 ? (
              <li className="px-4 py-12 text-center text-muted-foreground text-sm">
                No items on this order yet.
              </li>
            ) : (
              job.items.map((it, idx) => {
                const q = Number(it.quantity) || 0;
                const r = Number(it.rate) || 0;
                const line = q * r;
                const descParts = [it.category, it.description, it.size, it.material, it.finishing].filter(Boolean);
                const state = proofStateFor(it, reviews);
                return (
                  <li key={it.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-xs text-muted-foreground">#{idx + 1}</div>
                        <div className="mt-0.5 font-medium">{descParts[0] || '—'}</div>
                        {descParts.length > 1 && (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {descParts.slice(1).join(' · ')}
                          </div>
                        )}
                      </div>
                      <StatusPill status={it.printStatus || it.designStatus} size="sm" />
                    </div>
                    <div className="mt-2 flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {q || '—'} {it.unit || ''} × {fmt(r)}
                      </span>
                      <span className="font-medium">{fmt(line)}</span>
                    </div>
                    <div className="mt-3">
                      <ProofCell
                        state={state}
                        onReview={() => setReviewingItem(it)}
                      />
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </CardBody>
      </Card>

      {job.jobStatus === 'Pending Review' ? (
        <Card tone="muted" className="border-dashed">
          <CardBody className="p-6 text-sm">
            <div className="font-body font-semibold text-base">Waiting for staff to review</div>
            <p className="mt-1 text-muted-foreground">
              Pricing and delivery date will appear here once we&apos;ve confirmed your request.
              We&apos;ll email you as soon as it moves forward.
            </p>
          </CardBody>
        </Card>
      ) : (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardBody className="p-6 space-y-2 text-sm">
            <TotalsRow label="Subtotal" value={fmt(subtotal)} />
            {job.discountPct ? (
              <TotalsRow label={`Discount (${job.discountPct}%)`} value={`- ${fmt(discount)}`} muted />
            ) : null}
            {job.gstEnabled ? <TotalsRow label="GST 18%" value={fmt(gst)} muted /> : null}
            <div className="pt-3 border-t border-border mt-2">
              <TotalsRow label="Total" value={fmt(total)} bold />
            </div>
            {paid > 0 && (
              <>
                <TotalsRow label="Paid" value={fmt(paid)} muted />
                <TotalsRow
                  label="Balance"
                  value={balance > 0 ? fmt(balance) : 'Paid in full'}
                  bold
                  tone={balance > 0 ? 'amber' : 'emerald'}
                />
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                  Payments
                </div>
                <div className="mt-0.5 font-body font-semibold text-lg">
                  {paid > 0 ? fmt(paid) + ' received' : 'No payments recorded'}
                </div>
              </div>
              <FileText size={18} className="text-muted-foreground" />
            </div>

            <ul className="space-y-2 text-sm">
              {Number(job.advancePaid) > 0 && (
                <li className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <div>
                    <div className="font-medium">Advance</div>
                    {job.advancePaidOn && (
                      <div className="text-xs text-muted-foreground">{fmtDate(job.advancePaidOn)}</div>
                    )}
                  </div>
                  <div className="font-medium">{fmt(Number(job.advancePaid))}</div>
                </li>
              )}
              {partials.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <div>
                    <div className="font-medium">{p.note || 'Payment'}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(p.paid_on)}</div>
                  </div>
                  <div className="font-medium">{fmt(Number(p.amount))}</div>
                </li>
              ))}
              {paid === 0 && (
                <li className="text-sm text-muted-foreground">
                  Payment history will appear here once we record one.
                </li>
              )}
            </ul>
          </CardBody>
        </Card>
      </div>
      )}

      {job.jobStatus === 'Delivered' && (
        <FeedbackInline jobId={jobId} feedback={feedbackQ.data ?? null} />
      )}

      {reviewingItem && user && (
        <ProofReviewModal
          open={Boolean(reviewingItem)}
          onOpenChange={(next) => {
            if (!next) setReviewingItem(null);
          }}
          item={reviewingItem}
          customerUserId={user.id}
          history={reviewingHistory}
          onSubmitted={handleSubmitted}
        />
      )}

      {reorderOpen && (
        <ReorderModal
          open={reorderOpen}
          onOpenChange={setReorderOpen}
          sourceJob={job}
        />
      )}
    </div>
  );
}

function ProofCell({
  state,
  onReview,
}: {
  state: ProofState;
  onReview: () => void;
}) {
  if (state.kind === 'none') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <ImageOff size={13} /> Proof not yet uploaded
      </span>
    );
  }
  if (state.kind === 'approved') {
    return (
      <div className="space-y-1">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
          <Check size={12} /> Approved{state.at ? ` ${fmtDate(state.at)}` : ''}
        </span>
        <div>
          <button
            onClick={onReview}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            View proof
          </button>
        </div>
      </div>
    );
  }
  if (state.kind === 'changes_requested') {
    return (
      <div className="space-y-1">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
          <RotateCw size={12} /> Changes requested
        </span>
        <div className="text-xs text-muted-foreground line-clamp-2 max-w-[32ch]">
          “{state.comment}”
        </div>
        <button
          onClick={onReview}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          Revise request
        </button>
      </div>
    );
  }
  // pending
  return (
    <Button size="sm" variant="primary" onClick={onReview}>
      <MessageSquare size={13} /> Review proof
    </Button>
  );
}

function FeedbackInline({
  jobId,
  feedback,
}: {
  jobId: number;
  feedback: JobFeedback | null;
}) {
  if (!feedback) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardBody className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-3">
            <Star size={18} className="text-amber-500" />
            <div>
              <div className="font-body font-semibold">How did we do?</div>
              <div className="text-sm text-muted-foreground">
                Your feedback helps us improve.
              </div>
            </div>
          </div>
          <Link href={`/portal/orders/${jobId}/feedback`}>
            <Button variant="primary" size="sm">
              Rate this job
            </Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  const canEdit = isFeedbackEditable(feedback);
  return (
    <Card>
      <CardBody className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-4 min-w-0">
          <StarRating value={feedback.rating} size="md" readOnly />
          {feedback.comment && (
            <p className="text-sm text-muted-foreground line-clamp-2 max-w-[50ch]">
              “{feedback.comment}”
            </p>
          )}
        </div>
        {canEdit && (
          <Link href={`/portal/orders/${jobId}/feedback`}>
            <Button variant="outline" size="sm">Edit feedback</Button>
          </Link>
        )}
      </CardBody>
    </Card>
  );
}

function TotalsRow({
  label,
  value,
  muted,
  bold,
  tone,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
  tone?: 'amber' | 'emerald';
}) {
  const toneCls = tone === 'amber' ? 'text-amber-700' : tone === 'emerald' ? 'text-emerald-700' : '';
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? 'text-muted-foreground' : ''}>{label}</span>
      <span className={`${bold ? 'font-semibold' : ''} ${toneCls}`}>{value}</span>
    </div>
  );
}
