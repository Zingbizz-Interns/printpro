import { supabase } from '@/lib/supabase/client';
import type { ProfileRow } from '@/types/db';

/** All profiles, ordered by name. */
export async function listAllStaff(): Promise<ProfileRow[]> {
  const { data, error } = await supabase()
    .from('profiles')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data ?? []) as ProfileRow[];
}

/** Active profiles — used for the "by X" picker and reports filter. */
export async function listActiveStaff(): Promise<ProfileRow[]> {
  const { data, error } = await supabase()
    .from('profiles')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return (data ?? []) as ProfileRow[];
}

/** Fetch the profile row for the currently authenticated user. */
export async function getMyProfile(): Promise<ProfileRow | null> {
  const sb = supabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (error) return null;
  return data as ProfileRow;
}

/** Owner-only: update display fields on any profile. RLS enforces. */
export async function updateProfile(
  id: string,
  patch: Partial<Pick<ProfileRow, 'name' | 'username' | 'role' | 'color' | 'is_active'>>,
): Promise<void> {
  const { error } = await supabase().from('profiles').update(patch).eq('id', id);
  if (error) throw error;
}
