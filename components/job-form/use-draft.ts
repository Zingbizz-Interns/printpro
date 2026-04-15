'use client';

import { useCallback, useMemo, useState } from 'react';
import type { Job, JobItem } from '@/types/db';
import { makeBlankItem } from '@/lib/domain/draft';
import { deriveJobStatus, derivePaymentStatus, jobGrandTotal, itemsSubtotal, getTotalPaid } from '@/lib/domain/totals';

export interface DraftApi {
  draft: Job;
  update: (patch: Partial<Job>) => void;
  replace: (next: Job) => void;
  addItem: (partial?: Partial<JobItem>) => void;
  updateItem: (idx: number, patch: Partial<JobItem>) => void;
  removeItem: (idx: number) => void;
  moveItem: (from: number, to: number) => void;

  // Derived
  derivedJobStatus: Job['jobStatus'];
  derivedPaymentStatus: Job['paymentStatus'];
  subtotal: number;
  grandTotal: number;
  totalPaid: number;
  balance: number;

  resetDirty: () => void;
}

export function useDraft(initial: Job): DraftApi {
  const [draft, setDraft] = useState<Job>(initial);

  const update = useCallback((patch: Partial<Job>) => {
    setDraft((prev) => ({ ...prev, ...patch, _dirty: true }));
  }, []);

  const replace = useCallback((next: Job) => {
    setDraft(next);
  }, []);

  const addItem = useCallback((partial?: Partial<JobItem>) => {
    setDraft((prev) => ({
      ...prev,
      items: [...prev.items, makeBlankItem({ sortOrder: prev.items.length, ...partial })],
      _dirty: true,
    }));
  }, []);

  const updateItem = useCallback((idx: number, patch: Partial<JobItem>) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
      _dirty: true,
    }));
  }, []);

  const removeItem = useCallback((idx: number) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
      _dirty: true,
    }));
  }, []);

  const moveItem = useCallback((from: number, to: number) => {
    setDraft((prev) => {
      const next = prev.items.slice();
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return { ...prev, items: next, _dirty: true };
    });
  }, []);

  const derivedJobStatus = useMemo(
    () => deriveJobStatus(draft.items, draft.jobStatus),
    [draft.items, draft.jobStatus],
  );
  const derivedPaymentStatus = useMemo(() => derivePaymentStatus(draft), [draft]);
  const subtotal = useMemo(() => itemsSubtotal(draft.items), [draft.items]);
  const grandTotal = useMemo(() => jobGrandTotal(draft), [draft]);
  const totalPaid = useMemo(() => getTotalPaid(draft), [draft]);
  const balance = grandTotal - totalPaid;

  const resetDirty = useCallback(() => {
    setDraft((prev) => ({ ...prev, _dirty: false }));
  }, []);

  return {
    draft,
    update,
    replace,
    addItem,
    updateItem,
    removeItem,
    moveItem,
    derivedJobStatus,
    derivedPaymentStatus,
    subtotal,
    grandTotal,
    totalPaid,
    balance,
    resetDirty,
  };
}
