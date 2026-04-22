import { supabase } from '@/lib/supabase/client';

export type RoleDestination = '/dashboard' | '/kanban' | '/portal';

/**
 * Determine where an authenticated user should land based on which
 * profile table their uuid lives in.
 *
 *   - public.profiles, role=owner, is_active=true  → /dashboard
 *   - public.profiles, role=staff, is_active=true  → /kanban
 *   - public.customer_profiles (any row)           → /portal
 *   - neither                                      → null (caller
 *     should sign the user out and show an error)
 *
 * Both tables are queried in parallel. Staff takes precedence if a
 * uuid somehow exists in both (shouldn't happen — the two tables are
 * disjoint by design — but it's the safer fallback for an owner).
 */
export async function resolveRoleDestination(
  userId: string,
): Promise<RoleDestination | null> {
  const sb = supabase();
  const [staffRes, customerRes] = await Promise.all([
    sb
      .from('profiles')
      .select('role, is_active')
      .eq('id', userId)
      .maybeSingle(),
    sb
      .from('customer_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle(),
  ]);

  const staff = staffRes.data as { role: 'owner' | 'staff'; is_active: boolean } | null;
  if (staff && staff.is_active) {
    return staff.role === 'owner' ? '/dashboard' : '/kanban';
  }

  if (customerRes.data) return '/portal';

  return null;
}
