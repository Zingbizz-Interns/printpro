/**
 * Hand-written types mirroring the Supabase schema inferred from
 * `refference/API.md` (sections 2 + mappers at copy.html:2580-2672).
 *
 * No `supabase gen types` — we don't have project access. Update these
 * when the live schema changes.
 */

// ── DB rows (snake_case, as they come out of Postgres) ──────────

/**
 * Row in `public.profiles`. Keyed by `auth.users.id` (uuid) — credentials
 * live in Supabase Auth. Username is a display handle only.
 */
export interface ProfileRow {
  id: string;                       // uuid, FK → auth.users.id
  name: string;
  username: string;
  role: 'owner' | 'staff';
  color: string;
  is_active: boolean;
}

export interface ProductRow {
  id: number;
  name: string;
  sort_order: number;
}

export interface JobOrderRow {
  id: number;
  job_no: number;
  order_date: string | null;
  company_name: string;
  contact_person: string;
  contact_number: string;
  additional_contact: string;
  email_id: string;
  gst_no: string;
  customer_address: string;
  delivery_date: string | null;
  delivery_time: string;
  job_status: JobStatus;
  payment_status: PaymentStatus;
  advance_paid: number | string;
  advance_paid_on: string | null;
  balance_paid_on: string | null;
  special_notes: string;
  gst_enabled: boolean;
  round_off: boolean;
  discount_pct: number | string;
  created_by: string;               // display-name snapshot (frozen at save)
  created_by_id: string | null;     // uuid, FK → profiles.id
  customer_user_id: string | null;  // uuid, FK → customer_profiles.id (portal link)
}

export interface CustomerProfileRow {
  id: string;                       // uuid, FK → auth.users.id
  email: string;
  name: string;
  company_name: string;
  contact_number: string;
  gst_no: string;
  billing_address: string;
  gst_certificate_url: string | null;
  email_prefs: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface JobItemRow {
  id: number;
  job_order_id: number;
  job_no_sub: string;
  category: string;
  description: string;
  size: string;
  material: string;
  specs: string;
  finishing: string;
  quantity: number | string;
  unit: string;
  rate: number | string;
  design_status: DesignStatus;
  print_status: PrintStatus;
  remarks: string;
  image_url: string;
  sort_order: number;
  proof_uploaded_at?: string | null;
}

export type ProofDecision = 'approved' | 'changes_requested';

export interface ProofReviewRow {
  id: number;
  job_item_id: number;
  customer_user_id: string;
  decision: ProofDecision;
  comment: string;
  created_at: string;
}

export interface PartialPaymentRow {
  id: number;
  job_order_id: number;
  amount: number | string;
  paid_on: string;
  note: string; // "<mode> · <reference>"
}

export interface CustomerRow {
  id: number;
  company_name: string;
  contact_person: string;
  contact_number: string;
  additional_contact: string;
  email_id: string;
  gst_no: string;
  address: string;
  notes: string;
}

// ── Status enums (strings from the reference app) ───────────────

export type JobStatus =
  | 'Pending Review'
  | 'Design - Not yet Started'
  | 'Design - In Progress'
  | 'Design - Approved'
  | 'In Printing'
  | 'In Finishing'
  | 'Ready for Delivery'
  | 'Delivered'
  | 'On Hold';

export type DesignStatus =
  | 'Design - Not yet Started'
  | 'Design - In Progress'
  | 'Design - Approved'
  | 'In Finishing';

export type PrintStatus =
  | 'Not Printed'
  | 'In Printing'
  | 'Printing'
  | 'Quality Check'
  | 'Ready'
  | 'Ready for Delivery'
  | 'Delivered';

export type PaymentStatus = 'Unpaid' | 'Advance Paid' | 'Fully Paid';

export type PaymentMode = 'UPI' | 'Cash' | 'Bank Transfer' | 'Cheque' | 'Card';

// ── App-side (camelCase) shapes ─────────────────────────────────
// Mirror copy.html dbToJob / dbToItem output.

export interface Job {
  id: number | string; // string only for unsaved drafts
  jobNo: number;
  orderDate: string;
  companyName: string;
  contactPerson: string;
  contactNumber: string;
  additionalContact: string;
  emailId: string;
  gstNo: string;
  customerAddress: string;
  deliveryDate: string;
  deliveryTime: string;
  jobStatus: JobStatus;
  paymentStatus: PaymentStatus;
  advancePaid: number;
  advancePaidOn: string;
  balancePaidOn: string;
  specialNotes: string;
  gstEnabled: boolean;
  roundOff: boolean;
  discountPct: number;
  createdBy: string;                // display-name snapshot
  createdById: string | null;       // uuid, populated from session when saving
  customerUserId: string | null;    // uuid, FK → customer_profiles.id
  items: JobItem[];
  _dirty?: boolean;
  _isNew?: boolean;
  _isDraft?: boolean;
  _partialPayments?: PartialPaymentRow[];
}

export interface JobItem {
  id: number | string;
  jobNoSub: string;
  category: string;
  description: string;
  size: string;
  material: string;
  specs: string;
  finishing: string;
  quantity: number | '';
  unit: string;
  rate: number | '';
  designStatus: DesignStatus;
  printStatus: PrintStatus;
  remarks: string;
  imageUrl: string;
  sortOrder: number;
  proofUploadedAt: string | null;
}

export interface ProofReview {
  id: number;
  jobItemId: number;
  customerUserId: string;
  decision: ProofDecision;
  comment: string;
  createdAt: string;
}

export type ArtworkSource = 'quote' | 'upload' | 'reorder';

export interface CustomerArtworkRow {
  id: number;
  customer_user_id: string;
  file_url: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  source: ArtworkSource;
  source_job_id: number | null;
  uploaded_at: string;
}

export interface CustomerArtwork {
  id: number;
  customerUserId: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  source: ArtworkSource;
  sourceJobId: number | null;
  uploadedAt: string;
}

/**
 * Line item shape used for the create_pending_job RPC — only the
 * fields a customer can influence. No rate, no status, no sort_order.
 */
export interface PendingJobItemInput {
  category: string;
  description: string;
  size?: string;
  material?: string;
  specs?: string;
  finishing?: string;
  quantity: number;
  unit?: string;
  image_url?: string;
}

export interface JobFeedbackRow {
  id: number;
  job_order_id: number;
  customer_user_id: string;
  rating: number;
  comment: string;
  would_recommend: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface JobFeedback {
  id: number;
  jobOrderId: number;
  customerUserId: string;
  rating: number;
  comment: string;
  wouldRecommend: boolean | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Shape used by the staff dashboard — a feedback row joined with the
 * minimal job + customer context needed to render the list.
 */
export interface JobFeedbackWithContext extends JobFeedback {
  jobNo: number;
  companyName: string;
  customerName: string;
}

export interface SessionUser {
  id: string;                       // uuid from auth.users
  name: string;
  username: string;
  role: 'owner' | 'staff';
  color: string;
}

/**
 * App-side shape of a customer-portal user. Mirrors CustomerProfileRow
 * but camelCased.
 */
export interface CustomerSessionUser {
  id: string;                       // uuid from auth.users
  email: string;
  name: string;
  companyName: string;
  contactNumber: string;
  gstNo: string;
  billingAddress: string;
  gstCertificateUrl: string | null;
  emailPrefs: Record<string, boolean>;
}
