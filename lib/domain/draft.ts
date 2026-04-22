import type { Job, JobItem, DesignStatus, PrintStatus, JobStatus } from '@/types/db';

let _tmpId = 0;
function tmpId(): string {
  _tmpId += 1;
  return `_tmp_${Date.now()}_${_tmpId}`;
}

export function makeBlankItem(defaults?: Partial<JobItem>): JobItem {
  return {
    id: tmpId(),
    jobNoSub: '',
    category: '',
    description: '',
    size: '',
    material: '',
    specs: '',
    finishing: '',
    quantity: '' as '' | number,
    unit: 'Nos',
    rate: '' as '' | number,
    designStatus: 'Design - Not yet Started' as DesignStatus,
    printStatus: 'Not Printed' as PrintStatus,
    remarks: '',
    imageUrl: '',
    sortOrder: 0,
    proofUploadedAt: null,
    ...defaults,
  };
}

/** Build a blank draft job. `jobNo` is assigned at save time. */
export function makeDraftJob(createdBy?: string, createdById?: string | null): Job {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: tmpId(),
    jobNo: 0,
    orderDate: today,
    companyName: '',
    contactPerson: '',
    contactNumber: '',
    additionalContact: '',
    emailId: '',
    gstNo: '',
    customerAddress: '',
    deliveryDate: '',
    deliveryTime: '',
    jobStatus: 'Design - Not yet Started',
    paymentStatus: 'Unpaid',
    advancePaid: 0,
    advancePaidOn: '',
    balancePaidOn: '',
    specialNotes: '',
    gstEnabled: false,
    roundOff: true,
    discountPct: 0,
    createdBy: createdBy || '',
    createdById: createdById ?? null,
    customerUserId: null,
    items: [],
    _dirty: false,
    _isNew: true,
    _isDraft: true,
  };
}

/**
 * Clone a saved job into a new draft.
 * Strips IDs, resets payment data, keeps everything else.
 */
export function cloneJob(source: Job, createdBy?: string, createdById?: string | null): Job {
  return {
    ...source,
    id: tmpId(),
    jobNo: 0,
    orderDate: new Date().toISOString().slice(0, 10),
    advancePaid: 0,
    advancePaidOn: '',
    balancePaidOn: '',
    paymentStatus: 'Unpaid',
    jobStatus: 'Design - Not yet Started',
    createdBy: createdBy || '',
    createdById: createdById ?? null,
    items: source.items.map((it) => ({
      ...it,
      id: tmpId(),
      jobNoSub: '',
      designStatus: 'Design - Not yet Started',
      printStatus: 'Not Printed',
    })),
    _dirty: true,
    _isNew: true,
    _isDraft: true,
    _partialPayments: undefined,
  };
}

/**
 * Map a target job status to the (designStatus, printStatus) pair that every
 * item should take so `deriveJobStatus` produces that same status.
 *
 * Meta statuses the derivation can't produce from items (`Pending Review`,
 * `On Hold`) reset items to neutral so the derivation falls through to the
 * job-level `jobStatus` fallback.
 */
export function itemStageForJobStatus(
  status: JobStatus,
): { designStatus: DesignStatus; printStatus: PrintStatus } {
  switch (status) {
    case 'Design - Not yet Started':
    case 'Pending Review':
    case 'On Hold':
      return { designStatus: 'Design - Not yet Started', printStatus: 'Not Printed' };
    case 'Design - In Progress':
      return { designStatus: 'Design - In Progress', printStatus: 'Not Printed' };
    case 'Design - Approved':
      return { designStatus: 'Design - Approved', printStatus: 'Not Printed' };
    case 'In Printing':
      return { designStatus: 'Design - Approved', printStatus: 'In Printing' };
    case 'In Finishing':
      return { designStatus: 'In Finishing', printStatus: 'In Printing' };
    case 'Ready for Delivery':
      return { designStatus: 'In Finishing', printStatus: 'Ready' };
    case 'Delivered':
      return { designStatus: 'In Finishing', printStatus: 'Delivered' };
  }
}

/** Basic GST format: 2 digits + 5 letters + 4 digits + letter + digit + letter + digit/letter. */
export function isValidGst(gst: string): boolean {
  if (!gst) return true; // empty is allowed
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9][A-Z0-9]{2}$/i.test(gst.trim());
}

export function isValidPhone(p: string): boolean {
  if (!p) return true;
  return /^[0-9+\-\s()]{7,15}$/.test(p.trim());
}
