'use client';

import { useState } from 'react';
import { Check, MessageSquare, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { submitProofReview } from '@/lib/db/proof-reviews';
import { triggerPortalEvent } from '@/lib/email/client';
import type { JobItem, ProofReview } from '@/types/db';

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  item: JobItem;
  customerUserId: string;
  history: ProofReview[];
  onSubmitted: (review: ProofReview) => void;
}

export function ProofReviewModal({
  open,
  onOpenChange,
  item,
  customerUserId,
  history,
  onSubmitted,
}: Props) {
  const [mode, setMode] = useState<'idle' | 'approve' | 'changes'>('idle');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const descParts = [item.category, item.description, item.size, item.material, item.finishing].filter(Boolean);
  const title = descParts[0] || 'Review proof';

  function reset() {
    setMode('idle');
    setComment('');
    setErr(null);
    setBusy(false);
  }

  async function submit(decision: 'approved' | 'changes_requested') {
    if (typeof item.id !== 'number') {
      setErr('This item is still a draft — ask staff to save the job first.');
      return;
    }
    if (decision === 'changes_requested' && !comment.trim()) {
      setErr('Please tell us what to change.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const review = await submitProofReview({
        jobItemId: item.id,
        customerUserId,
        decision,
        comment: comment.trim(),
      });
      await triggerPortalEvent({
        type: decision === 'approved' ? 'proof-approved' : 'proof-changes-requested',
        reviewId: review.id,
      });
      onSubmitted(review);
      reset();
      onOpenChange(false);
    } catch (e) {
      setErr((e as Error).message || 'Could not submit your review.');
    } finally {
      setBusy(false);
    }
  }

  function onOpen(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpen}
      title={title}
      description="Review the design before we go to print."
      size="xl"
    >
      <div className="space-y-5">
        {item.imageUrl ? (
          <a
            href={item.imageUrl}
            target="_blank"
            rel="noreferrer"
            className="block rounded-2xl overflow-hidden border border-border bg-muted/30"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl}
              alt={title}
              className="w-full max-h-[60vh] object-contain bg-black/5"
            />
          </a>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center text-sm text-muted-foreground">
            No proof uploaded yet.
          </div>
        )}

        {history.length > 0 && (
          <details className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm">
            <summary className="cursor-pointer font-medium">
              Previous reviews ({history.length})
            </summary>
            <ul className="mt-3 space-y-2 text-xs">
              {history
                .slice()
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((r) => (
                  <li key={r.id} className="rounded-lg bg-background/60 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {r.decision === 'approved' ? '✓ Approved' : '⟳ Changes requested'}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString('en-IN')}
                      </span>
                    </div>
                    {r.comment && (
                      <div className="mt-1 text-muted-foreground whitespace-pre-wrap">
                        {r.comment}
                      </div>
                    )}
                  </li>
                ))}
            </ul>
          </details>
        )}

        {mode === 'changes' && (
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              What should change?
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              autoFocus
              placeholder="e.g. Logo should be larger · swap the red for our brand orange"
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          </div>
        )}

        {err && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          {mode !== 'changes' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMode('changes')}
              disabled={busy || !item.imageUrl}
            >
              <MessageSquare size={14} /> Request changes
            </Button>
          )}
          {mode === 'changes' && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setMode('idle')} disabled={busy}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => submit('changes_requested')}
                disabled={busy || !comment.trim()}
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
                Send request
              </Button>
            </>
          )}
          {mode === 'idle' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => submit('approved')}
              disabled={busy || !item.imageUrl}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Approve proof
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

