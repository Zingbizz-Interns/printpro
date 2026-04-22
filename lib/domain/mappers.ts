/**
 * DB ↔ App mappers. Ports copy.html:2580-2672 verbatim.
 * The reference app's mapper shape is load-bearing — many downstream
 * calculations depend on these exact fields being present.
 */

import type {
  CustomerProfileRow,
  CustomerSessionUser,
  Job,
  JobItem,
  JobItemRow,
  JobOrderRow,
} from '@/types/db';

export function dbToJob(row: JobOrderRow & { job_items?: JobItemRow[] }): Job {
  return {
    id: row.id,
    jobNo: row.job_no,
    orderDate: row.order_date || '',
    companyName: row.company_name || '',
    contactPerson: row.contact_person || '',
    contactNumber: row.contact_number || '',
    additionalContact: row.additional_contact || '',
    emailId: row.email_id || '',
    gstNo: row.gst_no || '',
    customerAddress: row.customer_address || '',
    deliveryDate: row.delivery_date || '',
    deliveryTime: row.delivery_time || '',
    jobStatus: row.job_status || 'Design - Not yet Started',
    paymentStatus: row.payment_status || 'Unpaid',
    advancePaid: toNum(row.advance_paid),
    advancePaidOn: row.advance_paid_on || '',
    balancePaidOn: row.balance_paid_on || '',
    specialNotes: row.special_notes || '',
    gstEnabled: row.gst_enabled || false,
    roundOff: row.round_off !== false,
    discountPct: toNum(row.discount_pct),
    createdBy: row.created_by || '',
    createdById: row.created_by_id || null,
    customerUserId: row.customer_user_id || null,
    items: (row.job_items || [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(dbToItem),
    _dirty: false,
  };
}

export function dbToItem(row: JobItemRow): JobItem {
  return {
    id: row.id,
    jobNoSub: row.job_no_sub || '',
    category: row.category || '',
    description: row.description || '',
    size: row.size || '',
    material: row.material || '',
    specs: row.specs || '',
    finishing: row.finishing || '',
    quantity: toNumOrBlank(row.quantity),
    unit: row.unit || 'Nos',
    rate: toNumOrBlank(row.rate),
    designStatus: row.design_status || 'Design - Not yet Started',
    printStatus: row.print_status || 'Not Printed',
    remarks: row.remarks || '',
    imageUrl: row.image_url || '',
    sortOrder: row.sort_order || 0,
    proofUploadedAt: row.proof_uploaded_at ?? null,
  };
}

export function jobToDb(
  j: Job,
  fallbackCreatedBy?: string,
  fallbackCreatedById?: string | null,
): Omit<JobOrderRow, 'id'> {
  return {
    job_no: j.jobNo,
    order_date: j.orderDate || null,
    company_name: j.companyName,
    contact_person: j.contactPerson,
    contact_number: j.contactNumber,
    additional_contact: j.additionalContact,
    email_id: j.emailId,
    gst_no: j.gstNo,
    customer_address: j.customerAddress,
    delivery_date: j.deliveryDate || null,
    delivery_time: j.deliveryTime,
    job_status: j.jobStatus,
    payment_status: j.paymentStatus,
    advance_paid: toNum(j.advancePaid),
    advance_paid_on: j.advancePaidOn || null,
    balance_paid_on: j.balancePaidOn || null,
    special_notes: j.specialNotes,
    gst_enabled: j.gstEnabled,
    round_off: j.roundOff !== false,
    discount_pct: toNum(j.discountPct),
    created_by: j.createdBy || fallbackCreatedBy || '',
    created_by_id: j.createdById ?? fallbackCreatedById ?? null,
    customer_user_id: j.customerUserId ?? null,
  };
}

export function dbToCustomerSessionUser(
  row: CustomerProfileRow,
): CustomerSessionUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name || '',
    companyName: row.company_name || '',
    contactNumber: row.contact_number || '',
    gstNo: row.gst_no || '',
    billingAddress: row.billing_address || '',
    gstCertificateUrl: row.gst_certificate_url || null,
    emailPrefs: row.email_prefs || {},
  };
}

export function itemToDb(
  item: JobItem,
  jobOrderId: number,
  idx: number,
): Omit<JobItemRow, 'id'> {
  return {
    job_order_id: jobOrderId,
    job_no_sub: item.jobNoSub,
    category: item.category,
    description: item.description,
    size: item.size || '',
    material: item.material || '',
    specs: item.specs || '',
    finishing: item.finishing || '',
    quantity: toNum(item.quantity),
    unit: item.unit,
    rate: toNum(item.rate),
    design_status: item.designStatus,
    print_status: item.printStatus,
    remarks: item.remarks,
    image_url: item.imageUrl || '',
    sort_order: idx,
  };
}

function toNum(v: unknown): number {
  const n = parseFloat(v as string);
  return Number.isFinite(n) ? n : 0;
}
function toNumOrBlank(v: unknown): number | '' {
  const n = parseFloat(v as string);
  return Number.isFinite(n) ? n : '';
}
