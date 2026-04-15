'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth/store';
import { insertJob, updateJob, deleteJob, nextJobNo } from '@/lib/db/jobs';
import { syncCustomerFromJob } from '@/lib/db/customers';
import { listPaymentsForJob } from '@/lib/db/payments';
import { useDraft } from './use-draft';
import { CustomerSection } from './customer-section';
import { DeliverySection } from './delivery-section';
import { ItemsTable } from './items-table';
import { AdvanceSection } from './advance-section';
import { TotalsPanel } from './totals-panel';
import { ActionBar } from './action-bar';
import { PaymentModal } from '@/components/payments/payment-modal';
import { StickyNote } from '@/components/ui/sticky-note';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Job } from '@/types/db';
import { ChevronLeft } from 'lucide-react';
import { cloneJob } from '@/lib/domain/draft';
import { useEffect, useState } from 'react';

interface Props {
  /** Initial job to edit, or a blank/cloned draft. */
  initial: Job;
}

export function JobForm({ initial }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.currentUser);
  const isOwner = useAuthStore((s) => s.isOwner());
  const api = useDraft(initial);
  const { draft, update, addItem, updateItem, removeItem } = api;

  const isNew = draft._isNew === true || typeof draft.id !== 'number';
  const delivered = api.derivedJobStatus === 'Delivered';
  const [saveError, setSaveError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  // Load partial payments for saved jobs and feed them back into the
  // draft so totals / payment-status derivation include them.
  const numericId = typeof draft.id === 'number' ? draft.id : null;
  const paymentsQ = useQuery({
    queryKey: ['payments', numericId],
    queryFn: () => listPaymentsForJob(numericId as number),
    enabled: numericId !== null,
  });
  useEffect(() => {
    if (paymentsQ.data) {
      // Replace _partialPayments without setting _dirty
      api.replace({ ...draft, _partialPayments: paymentsQ.data });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentsQ.data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!draft.companyName.trim()) throw new Error('Customer name is required.');

      // Apply derived statuses before persisting
      const toPersist: Job = {
        ...draft,
        jobStatus: api.derivedJobStatus,
        paymentStatus: api.derivedPaymentStatus,
        createdBy: draft.createdBy || user?.name || '',
        createdById: draft.createdById ?? user?.id ?? null,
      };

      if (isNew) {
        const jobNo = await nextJobNo();
        toPersist.jobNo = jobNo;
        toPersist.items = toPersist.items.map((it, i) => ({
          ...it,
          jobNoSub: `${jobNo}-${i + 1}`,
        }));
        const saved = await insertJob(toPersist, user?.name, user?.id ?? null);
        // Best-effort customer sync — don't fail the save if it errors
        try {
          await syncCustomerFromJob(saved);
        } catch {
          /* noop */
        }
        return saved;
      }

      const saved = await updateJob(toPersist);
      try {
        await syncCustomerFromJob(saved);
      } catch {
        /* noop */
      }
      return saved;
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      setSaveError(null);
      if (isNew) {
        router.replace(`/jobs/${saved.id}`);
      } else {
        api.replace(saved);
      }
    },
    onError: (err: Error) => setSaveError(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      if (typeof draft.id !== 'number') return;
      await deleteJob(draft.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] });
      router.replace('/kanban');
    },
  });

  function handleClone() {
    const cloned = cloneJob(draft, user?.name);
    api.replace(cloned);
    router.replace('/jobs/new');
  }

  function handleToggleDelivered(next: boolean) {
    if (next) {
      // Mark every item as Delivered → derivation will compute 'Delivered'
      const items = draft.items.map((it) => ({
        ...it,
        printStatus: 'Delivered' as const,
      }));
      update({ items });
    } else {
      // Roll back items that were set to Delivered
      const items = draft.items.map((it) =>
        it.printStatus === 'Delivered' ? { ...it, printStatus: 'Ready' as const } : it,
      );
      update({ items });
    }
  }

  function confirmDelete() {
    if (!window.confirm(`Delete Job #${draft.jobNo}?\n\nThis removes the order and all its items.`))
      return;
    deleteMut.mutate();
  }

  return (
    <div className="px-4 sm:px-6 py-6">
      {/* Sticky form header */}
      <div className="no-print sticky top-16 md:top-[68px] z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-paper/90 backdrop-blur border-b-2 border-dashed border-pencil/40 flex items-center gap-3 flex-wrap">
        <Link href="/kanban">
          <Button type="button" variant="ghost" size="sm">
            <ChevronLeft size={16} strokeWidth={2.5} /> board
          </Button>
        </Link>
        <StickyNote tilt="l" className="!text-base !py-0.5">
          {isNew ? 'new job' : `job #${draft.jobNo}`}
        </StickyNote>
        {draft.createdBy && (
          <Badge tone="muted" className="text-xs">
            by {draft.createdBy}
          </Badge>
        )}
        {draft._dirty && (
          <Badge tone="accent" dashed className="text-xs">
            unsaved
          </Badge>
        )}
        <div className="flex-1" />
        {saveError && (
          <div className="text-sm font-bold text-accent bg-accent-lt border-2 border-accent wobbly-sm px-3 py-1">
            ✗ {saveError}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 mt-4 items-start">
        {/* Main column */}
        <div className="space-y-6 min-w-0">
          <CustomerSection draft={draft} onUpdate={update} />
          <DeliverySection draft={draft} onUpdate={update} />
          <ItemsTable
            items={draft.items}
            jobNo={draft.jobNo}
            onAdd={() => addItem()}
            onUpdate={updateItem}
            onRemove={removeItem}
          />
          <AdvanceSection draft={draft} grandTotal={api.grandTotal} onUpdate={update} />
        </div>

        {/* Side column (totals sticky on desktop) */}
        <div className="lg:sticky lg:top-[140px]">
          <TotalsPanel
            draft={draft}
            subtotal={api.subtotal}
            grandTotal={api.grandTotal}
            totalPaid={api.totalPaid}
            balance={api.balance}
            derivedJobStatus={api.derivedJobStatus}
            derivedPaymentStatus={api.derivedPaymentStatus}
            onUpdate={update}
          />
        </div>
      </div>

      <ActionBar
        isNew={isNew}
        isOwner={isOwner}
        dirty={draft._dirty === true}
        saving={saveMut.isPending}
        deleting={deleteMut.isPending}
        grandTotal={api.grandTotal}
        balance={api.balance}
        delivered={delivered}
        onSave={() => saveMut.mutate()}
        onDelete={!isNew ? confirmDelete : undefined}
        onClone={!isNew ? handleClone : undefined}
        onOpenPayments={!isNew ? () => setPayOpen(true) : undefined}
        onPrint={!isNew ? () => window.print() : undefined}
        onToggleDelivered={handleToggleDelivered}
      />

      {numericId !== null && (
        <PaymentModal
          open={payOpen}
          onOpenChange={setPayOpen}
          jobId={numericId}
          jobNo={draft.jobNo}
          companyName={draft.companyName}
          grandTotal={api.grandTotal}
          advancePaid={Number(draft.advancePaid) || 0}
          isOwner={isOwner}
        />
      )}
    </div>
  );
}
