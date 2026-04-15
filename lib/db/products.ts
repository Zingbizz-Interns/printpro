import { supabase } from '@/lib/supabase/client';
import type { ProductRow } from '@/types/db';

/** List all products, ordered (copy.html:2573). */
export async function listProducts(): Promise<ProductRow[]> {
  const { data, error } = await supabase()
    .from('products')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as ProductRow[];
}

/** Add product (copy.html:2846). */
export async function addProduct(name: string, sortOrder: number): Promise<void> {
  const { error } = await supabase()
    .from('products')
    .insert({ name, sort_order: sortOrder });
  if (error) throw error;
}

/**
 * Rename a product AND cascade the new name to all job_items
 * that reference the old name (copy.html:2831-2833).
 */
export async function renameProduct(oldName: string, newName: string): Promise<void> {
  const sb = supabase();
  const { error: e1 } = await sb.from('products').update({ name: newName }).eq('name', oldName);
  if (e1) throw e1;
  const { error: e2 } = await sb.from('job_items').update({ category: newName }).eq('category', oldName);
  if (e2) throw e2;
}

/** Delete a product by name (copy.html:2814-2815). Two-step lookup + delete. */
export async function deleteProductByName(name: string): Promise<void> {
  const sb = supabase();
  const { data, error: e1 } = await sb
    .from('products')
    .select('id')
    .eq('name', name)
    .single();
  if (e1 || !data) return;
  const { error: e2 } = await sb.from('products').delete().eq('id', data.id);
  if (e2) throw e2;
}
