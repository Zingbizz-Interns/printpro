'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useCustomerAuthStore } from '@/lib/auth/customer-store';
import { dbToCustomerSessionUser } from '@/lib/domain/mappers';
import type { CustomerProfileRow } from '@/types/db';

/**
 * Mount once inside the /portal layout. Keeps useCustomerAuthStore in
 * sync with Supabase Auth, loading the matching customer_profiles row.
 * Deliberately scoped to the portal layout so it does not run on the
 * staff app — the two stores coexist without interference.
 */
export function CustomerSessionSync() {
  const setUser = useCustomerAuthStore((s) => s.setUser);
  const setHydrated = useCustomerAuthStore((s) => s.setHydrated);

  useEffect(() => {
    const sb = supabase();
    let cancelled = false;

    async function loadForUserId(userId: string | null) {
      if (!userId) {
        if (!cancelled) setUser(null);
        return;
      }
      const { data, error } = await sb
        .from('customer_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (cancelled) return;
      if (error || !data) {
        // Authenticated user with no customer_profiles row — likely a
        // staff account whose session is also visible on a portal
        // page. Treat as not a portal user; the layout will bounce
        // them back to /login.
        setUser(null);
        return;
      }
      setUser(dbToCustomerSessionUser(data as CustomerProfileRow));
    }

    (async () => {
      const {
        data: { session },
      } = await sb.auth.getSession();
      await loadForUserId(session?.user?.id ?? null);
      if (!cancelled) setHydrated(true);
    })();

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      void loadForUserId(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [setUser, setHydrated]);

  return null;
}
