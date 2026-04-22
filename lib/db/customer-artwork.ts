import { supabase } from '@/lib/supabase/client';
import { CUSTOMER_DOCS_BUCKET } from '@/lib/db/storage';
import type {
  ArtworkSource,
  CustomerArtwork,
  CustomerArtworkRow,
} from '@/types/db';

function rowToArtwork(r: CustomerArtworkRow): CustomerArtwork {
  return {
    id: r.id,
    customerUserId: r.customer_user_id,
    fileUrl: r.file_url,
    fileName: r.file_name ?? '',
    mimeType: r.mime_type ?? '',
    sizeBytes: r.size_bytes ?? 0,
    source: r.source,
    sourceJobId: r.source_job_id ?? null,
    uploadedAt: r.uploaded_at,
  };
}

/** List all artwork the signed-in customer has uploaded through the portal. */
export async function listMyArtwork(customerUserId: string): Promise<CustomerArtwork[]> {
  const { data, error } = await supabase()
    .from('customer_artwork')
    .select('*')
    .eq('customer_user_id', customerUserId)
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as CustomerArtworkRow[]).map(rowToArtwork);
}

export interface ArtworkProof {
  jobId: number;
  jobNo: number;
  jobItemId: number;
  imageUrl: string;
  description: string;
  proofUploadedAt: string | null;
}

/**
 * List every staff-uploaded proof image on the customer's jobs. These
 * aren't copied into `customer_artwork` (so staff can't have them
 * deleted out from under them); they're surfaced alongside portal
 * uploads in the locker view.
 */
export async function listMyJobProofs(customerUserId: string): Promise<ArtworkProof[]> {
  const { data, error } = await supabase()
    .from('job_orders')
    .select(
      'id, job_no, customer_user_id, job_items(id, description, category, size, material, finishing, image_url, proof_uploaded_at)',
    )
    .eq('customer_user_id', customerUserId)
    .order('job_no', { ascending: false });
  if (error) throw error;

  type Row = {
    id: number;
    job_no: number;
    job_items: Array<{
      id: number;
      description: string | null;
      category: string | null;
      size: string | null;
      material: string | null;
      finishing: string | null;
      image_url: string | null;
      proof_uploaded_at: string | null;
    }>;
  };

  const out: ArtworkProof[] = [];
  for (const job of (data ?? []) as Row[]) {
    for (const it of job.job_items ?? []) {
      if (!it.image_url) continue;
      const parts = [it.category, it.description, it.size, it.material, it.finishing]
        .map((p) => (p || '').trim())
        .filter(Boolean);
      out.push({
        jobId: job.id,
        jobNo: job.job_no,
        jobItemId: it.id,
        imageUrl: it.image_url,
        description: parts.join(' · ') || `Item #${it.id}`,
        proofUploadedAt: it.proof_uploaded_at,
      });
    }
  }
  return out;
}

/**
 * Delete a customer-uploaded artwork row **and** its storage object.
 * RLS scopes both ends to the caller's `{uuid}/...` prefix, so
 * enumeration is impossible without service-role access — the client
 * has to drive cleanup. Remove the object first; if the DB delete then
 * fails (RLS blocks it on a non-owned row), a stale file is still less
 * harmful than an orphaned row pointing at a deleted blob.
 */
export async function deleteArtwork(id: number, fileUrl: string): Promise<void> {
  const sb = supabase();
  if (fileUrl) {
    // Best-effort storage cleanup — ignore errors so a missing object
    // (already deleted, bucket churn) doesn't block the DB delete.
    await sb.storage.from(CUSTOMER_DOCS_BUCKET).remove([fileUrl]);
  }
  const { error } = await sb.from('customer_artwork').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Upload an artwork file to the `customer-documents` bucket under the
 * customer's uuid prefix, then register it in `customer_artwork` via
 * the server-authoritative RPC (customer_user_id is pinned to
 * auth.uid() inside the RPC).
 *
 * Returns the new row's id + a storage path.
 */
export async function uploadArtwork(args: {
  customerUserId: string;
  file: File;
  source: ArtworkSource;
  sourceJobId?: number | null;
}): Promise<{ id: number; path: string }> {
  const { customerUserId, file, source, sourceJobId } = args;
  const safeName = file.name.replace(/[^\w.\-]+/g, '_');
  const path = `${customerUserId}/artwork/${Date.now()}_${safeName}`;
  const sb = supabase();
  const { error: upErr } = await sb.storage
    .from(CUSTOMER_DOCS_BUCKET)
    .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
  if (upErr) throw upErr;

  const { data, error } = await sb.rpc('add_customer_artwork', {
    p_file_url: path,
    p_file_name: file.name,
    p_mime_type: file.type || '',
    p_size_bytes: file.size,
    p_source: source,
    p_source_job_id: sourceJobId ?? null,
  });
  if (error) throw error;
  return { id: Number(data), path };
}

/** Signed URL for viewing/downloading an artwork file. */
export async function getArtworkSignedUrl(
  path: string,
  expiresInSec = 300,
): Promise<string> {
  const { data, error } = await supabase()
    .storage.from(CUSTOMER_DOCS_BUCKET)
    .createSignedUrl(path, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}

/** Re-exporting for consumers that need the bucket name. */
export { CUSTOMER_DOCS_BUCKET };
