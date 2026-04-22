'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, RotateCw } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { createPendingJob } from '@/lib/db/quote-requests';
import type { Job, JobItem, PendingJobItemInput } from '@/types/db';

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  sourceJob: Job;
}

interface Line {
  key: string;
  include: boolean;
  quantity: number | '';
  snapshot: JobItem;
}

export function ReorderModal({ open, onOpenChange, sourceJob }: Props) {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>(() =>
    sourceJob.items.map((it, i) => ({
      key: `${it.id}_${i}`,
      include: true,
      quantity: Number(it.quantity) || 1,
      snapshot: it,
    })),
  );
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  async function submit() {
    setErr(null);
    const included = lines.filter((l) => l.include && Number(l.quantity) > 0);
    if (included.length === 0) {
      setErr('Select at least one item and set a quantity.');
      return;
    }
    setBusy(true);
    try {
      const items: PendingJobItemInput[] = included.map((l) => ({
        category: l.snapshot.category,
        description: l.snapshot.description,
        size: l.snapshot.size,
        material: l.snapshot.material,
        specs: l.snapshot.specs,
        finishing: l.snapshot.finishing,
        quantity: Number(l.quantity) || 0,
        unit: l.snapshot.unit,
      }));
      const newId = await createPendingJob({
        items,
        notes: notes.trim(),
        source: 'reorder',
        originalJobId: typeof sourceJob.id === 'number' ? sourceJob.id : null,
      });
      onOpenChange(false);
      router.push(`/portal/orders/${newId}`);
    } catch (e) {
      setErr((e as Error).message || 'Could not submit your reorder.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Reorder from Job #${sourceJob.jobNo}`}
      description="We'll send this to staff for review — they'll confirm pricing and delivery before it's final."
      size="lg"
    >
      <div className="space-y-5">
        <ul className="divide-y divide-border rounded-xl border border-border">
          {lines.map((l) => {
            const desc = [
              l.snapshot.category,
              l.snapshot.description,
              l.snapshot.size,
              l.snapshot.material,
              l.snapshot.finishing,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <li key={l.key} className="p-3 flex items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-foreground"
                  checked={l.include}
                  onChange={(e) => updateLine(l.key, { include: e.target.checked })}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{l.snapshot.category || '—'}</div>
                  {desc && (
                    <div className="text-xs text-muted-foreground truncate">{desc}</div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-right"
                    value={l.quantity}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateLine(l.key, { quantity: v === '' ? '' : Number(v) });
                    }}
                    disabled={!l.include}
                  />
                  <span className="text-xs text-muted-foreground w-10">{l.snapshot.unit || 'Nos'}</span>
                </div>
              </li>
            );
          })}
        </ul>

        <div>
          <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Anything to tell staff?
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="e.g. Same spec as last time, need by Friday"
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          />
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Staff will confirm pricing and delivery before we start printing. Nothing is billed yet.
        </div>

        {err && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={busy}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}
            Send reorder request
          </Button>
        </div>
      </div>
    </Modal>
  );
}
