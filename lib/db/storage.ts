import { supabase, SUPABASE_BUCKET } from '@/lib/supabase/client';

/** Upload a cropped JPEG blob and return its public URL (copy.html:5523-5525). */
export async function uploadJobImage(itemId: number | string, blob: Blob): Promise<string> {
  const sb = supabase();
  const fileName = `item_${itemId}_${Date.now()}.jpg`;
  const { error } = await sb.storage
    .from(SUPABASE_BUCKET)
    .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  const { data } = sb.storage.from(SUPABASE_BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

export const CUSTOMER_DOCS_BUCKET = 'customer-documents';

/**
 * Upload a GST certificate for the current customer. Path is
 * `{customer_user_id}/gst-cert.{ext}` — first path segment must equal
 * auth.uid() per the storage.objects RLS policy.
 *
 * Returns the storage path (not a public URL — the bucket is private).
 * Use `getSignedGstCertificateUrl` for display/download.
 */
export async function uploadGstCertificate(
  customerUserId: string,
  file: File,
): Promise<string> {
  const ext = extOf(file.name) || 'pdf';
  const path = `${customerUserId}/gst-cert.${ext}`;
  const { error } = await supabase()
    .storage.from(CUSTOMER_DOCS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw error;
  return path;
}

/** Short-lived signed URL for viewing a GST certificate (bucket is private). */
export async function getSignedGstCertificateUrl(
  path: string,
  expiresInSec = 300,
): Promise<string> {
  const { data, error } = await supabase()
    .storage.from(CUSTOMER_DOCS_BUCKET)
    .createSignedUrl(path, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}

function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}
