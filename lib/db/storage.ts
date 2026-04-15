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
