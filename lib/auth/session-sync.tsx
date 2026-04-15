'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth/store';
import type { ProfileRow, SessionUser } from '@/types/db';

/**
 * Mount once near the app root. Keeps `useAuthStore` in sync with
 * Supabase Auth: on first render, reads the current session and loads
 * the matching `profiles` row; thereafter listens for SIGNED_IN /
 * SIGNED_OUT / TOKEN_REFRESHED / USER_UPDATED events.
 */
export function SupabaseSessionSync() {
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    const sb = supabase();
    let cancelled = false;

    async function loadForUserId(userId: string | null) {
      if (!userId) {
        if (!cancelled) setUser(null);
        return;
      }
      const { data, error } = await sb
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (cancelled) return;
      if (error || !data) {
        setUser(null);
        return;
      }
      const p = data as ProfileRow;
      const u: SessionUser = {
        id: p.id,
        name: p.name,
        username: p.username,
        role: p.role,
        color: p.color,
      };
      setUser(u);
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
