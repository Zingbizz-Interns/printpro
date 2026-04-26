'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Paperclip, Plus, Send, Trash2 } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { useCustomerAuthStore } from '@/lib/auth/customer-store';
import { listProducts } from '@/lib/db/products';
import { UNIT_OPTIONS } from '@/lib/domain/units';
import { createPendingJob } from '@/lib/db/quote-requests';
import { uploadArtwork } from '@/lib/db/customer-artwork';
import { triggerPortalEvent } from '@/lib/email/client';
import type { PendingJobItemInput } from '@/types/db';

interface LineDraft {
  key: string;
  category: string;
  description: string;
  size: string;
  material: string;
  finishing: string;
  quantity: number | '';
  unit: string;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB — per plan

function makeBlankLine(): LineDraft {
  return {
    key: `line_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    category: '',
    description: '',
    size: '',
    material: '',
    finishing: '',
    quantity: 1,
    unit: 'Nos',
  };
}

export default function QuoteRequestPage() {
  const user = useCustomerAuthStore((s) => s.currentUser);
  const router = useRouter();

  const productsQ = useQuery({ queryKey: ['portal-products'], queryFn: listProducts });

  const [lines, setLines] = useState<LineDraft[]>([makeBlankLine()]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, makeBlankLine()]);
  }
  function removeLine(key: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  }

  function onPickFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (f.size > MAX_FILE_SIZE) {
        setErr(`"${f.name}" is over 20 MB — please compress and retry.`);
        continue;
      }
      next.push(f);
    }
    setFiles(next);
    if (fileInput.current) fileInput.current.value = '';
  }

  async function submit() {
    setErr(null);
    const included = lines
      .map((l) => ({ ...l, quantity: Number(l.quantity) || 0 }))
      .filter((l) => (l.category || l.description) && l.quantity > 0);
    if (included.length === 0) {
      setErr('Describe at least one item (category + quantity).');
      return;
    }
    if (!user) {
      setErr('You need to be signed in.');
      return;
    }
    setBusy(true);
    try {
      // Upload artwork first so we have urls to attach to the note,
      // and so files end up in the locker even if the RPC fails.
      const uploaded: { path: string; name: string }[] = [];
      for (const f of files) {
        try {
          const res = await uploadArtwork({
            customerUserId: user.id,
            file: f,
            source: 'quote',
          });
          uploaded.push({ path: res.path, name: f.name });
        } catch (e) {
          setErr(`Upload of "${f.name}" failed: ${(e as Error).message}`);
          setBusy(false);
          return;
        }
      }

      const items: PendingJobItemInput[] = included.map((l) => ({
        category: l.category,
        description: l.description,
        size: l.size,
        material: l.material,
        finishing: l.finishing,
        quantity: l.quantity,
        unit: l.unit || 'Nos',
      }));

      const attachmentsNote =
        uploaded.length > 0
          ? `Artwork attached: ${uploaded.map((u) => u.name).join(', ')}`
          : '';
      const composedNotes = [notes.trim(), attachmentsNote].filter(Boolean).join('\n\n');

      const newId = await createPendingJob({
        items,
        notes: composedNotes,
        source: 'quote',
        deliveryDate: deliveryDate || null,
      });

      // Notify staff — best-effort.
      await triggerPortalEvent({ type: 'quote-requested', jobId: newId });

      router.replace(`/portal/orders/${newId}`);
    } catch (e) {
      setErr((e as Error).message || 'Could not submit your quote request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href="/portal"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Overview
        </Link>
      </div>

      <div>
        <h1 className="font-display text-3xl tracking-tight">Request a quote</h1>
        <p className="mt-1 text-muted-foreground">
          Describe what you need — staff will price it and confirm before anything prints.
        </p>
      </div>

      <Card>
        <CardBody className="p-6 space-y-5">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              Items
            </div>
            <ul className="mt-3 space-y-3">
              {lines.map((l, idx) => (
                <li key={l.key} className="rounded-xl border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-xs text-muted-foreground">#{idx + 1}</div>
                    {lines.length > 1 && (
                      <button
                        onClick={() => removeLine(l.key)}
                        className="text-xs text-muted-foreground hover:text-red-600 inline-flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label>Category</Label>
                      <select
                        value={l.category}
                        onChange={(e) => updateLine(l.key, { category: e.target.value })}
                        className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-body font-medium"
                      >
                        <option value="">Select…</option>
                        {(productsQ.data ?? []).map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Quantity</Label>
                      <div className="mt-1.5 flex gap-2">
                        <Input
                          type="number"
                          min={1}
                          value={l.quantity}
                          onChange={(e) => {
                            const v = e.target.value;
                            updateLine(l.key, { quantity: v === '' ? '' : Number(v) });
                          }}
                        />
                        <select
                          value={l.unit}
                          onChange={(e) => updateLine(l.key, { unit: e.target.value })}
                          aria-label="Unit"
                          className="w-24 bg-card border border-border rounded-xl px-3 py-2.5 text-foreground font-body text-base focus:border-transparent focus:ring-2 focus:ring-ring focus:outline-none shadow-sm transition-all"
                        >
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      className="mt-1.5"
                      value={l.description}
                      onChange={(e) => updateLine(l.key, { description: e.target.value })}
                      placeholder="e.g. Business cards, matte, double-sided"
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <Label>Size (optional)</Label>
                      <Input
                        className="mt-1.5"
                        value={l.size}
                        onChange={(e) => updateLine(l.key, { size: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Material (optional)</Label>
                      <Input
                        className="mt-1.5"
                        value={l.material}
                        onChange={(e) => updateLine(l.key, { material: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Finishing (optional)</Label>
                      <Input
                        className="mt-1.5"
                        value={l.finishing}
                        onChange={(e) => updateLine(l.key, { finishing: e.target.value })}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <Button variant="outline" size="sm" onClick={addLine} className="mt-3">
              <Plus size={14} /> Add another item
            </Button>
          </div>

          <div>
            <Label>Target delivery date (optional)</Label>
            <Input
              type="date"
              className="mt-1.5 max-w-xs"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </div>

          <div>
            <Label>Notes for staff</Label>
            <Textarea
              rows={3}
              className="mt-1.5"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything else we should know — tight deadline, specific brand colours, etc."
            />
          </div>

          <div>
            <Label>Artwork (optional)</Label>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, AI, PSD, or image files — up to 20 MB each. These land in your artwork locker too.
            </p>
            <input
              ref={fileInput}
              type="file"
              multiple
              className="sr-only"
              onChange={(e) => onPickFiles(e.target.files)}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()} type="button">
                <Paperclip size={14} /> Attach files
              </Button>
              {files.map((f, i) => (
                <span
                  key={`${f.name}_${i}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs"
                >
                  {f.name}
                  <button
                    onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-red-600"
                    title="Remove"
                    type="button"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {err && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Link href="/portal">
              <Button variant="ghost" size="sm" disabled={busy}>
                Cancel
              </Button>
            </Link>
            <Button variant="primary" size="sm" onClick={submit} disabled={busy}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Send quote request
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
