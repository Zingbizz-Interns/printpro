import type { Job, JobItem, PaymentStatus, JobStatus } from '@/types/db';

/** Sum of quantity × rate across line items. */
export function itemsSubtotal(items: JobItem[]): number {
  return items.reduce((s, it) => {
    const q = typeof it.quantity === 'number' ? it.quantity : parseFloat(String(it.quantity)) || 0;
    const r = typeof it.rate === 'number' ? it.rate : parseFloat(String(it.rate)) || 0;
    return s + q * r;
  }, 0);
}

/** Grand total: subtotal − discount% + 18% GST + round-off (always on). */
export function jobGrandTotal(j: Pick<Job, 'items' | 'discountPct' | 'gstEnabled' | 'roundOff'>): number {
  const sub = itemsSubtotal(j.items);
  const disc = sub * ((j.discountPct || 0) / 100);
  const afterDisc = sub - disc;
  const withGst = j.gstEnabled ? afterDisc * 1.18 : afterDisc;
  return j.roundOff !== false ? Math.round(withGst) : withGst;
}

/** Sum of advance + all partial payments. */
export function getTotalPaid(j: Job): number {
  const adv = Number(j.advancePaid) || 0;
  const pp = (j._partialPayments || []).reduce(
    (s, p) => s + (parseFloat(String(p.amount)) || 0),
    0,
  );
  return adv + pp;
}

/** Payment status derivation (copy.html:4552). */
export function derivePaymentStatus(j: Job): PaymentStatus {
  const gt = jobGrandTotal(j);
  const tp = getTotalPaid(j);
  if (tp >= gt && gt > 0) return 'Fully Paid';
  if (tp > 0) return 'Advance Paid';
  return 'Unpaid';
}

/** Job status auto-derivation from item print/design statuses (copy.html:4586). */
export function deriveJobStatus(items: JobItem[], fallback: JobStatus): JobStatus {
  if (!items.length) return fallback;

  const allDelivered = items.every((i) => i.printStatus === 'Delivered');
  const allReady = items.every((i) =>
    (['Ready', 'Ready for Delivery', 'Delivered'] as string[]).includes(i.printStatus),
  );
  const anyFinishing = items.some(
    (i) => i.printStatus === 'Quality Check' || i.designStatus === 'In Finishing',
  );
  const anyPrinting = items.some(
    (i) => i.printStatus === 'Printing' || i.printStatus === 'In Printing',
  );
  const anyApproved = items.some(
    (i) => i.designStatus === 'Design - Approved',
  );
  const anyInProgress = items.some(
    (i) => i.designStatus === 'Design - In Progress',
  );

  if (allDelivered) return 'Delivered';
  if (allReady) return 'Ready for Delivery';
  if (anyFinishing) return 'In Finishing';
  if (anyPrinting) return 'In Printing';
  if (anyApproved) return 'Design - Approved';
  if (anyInProgress) return 'Design - In Progress';
  return fallback;
}

/** Format paise to ₹ Indian locale. */
export function fmt(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '₹0.00';
  const v = typeof n === 'number' ? n : parseFloat(n);
  if (!Number.isFinite(v)) return '₹0.00';
  return (
    '₹' +
    v.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
