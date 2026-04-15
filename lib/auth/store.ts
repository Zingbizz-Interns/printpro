'use client';

import { create } from 'zustand';
import type { SessionUser } from '@/types/db';
import { supabase } from '@/lib/supabase/client';

interface AuthState {
  currentUser: SessionUser | null;
  hydrated: boolean;                // true once we've checked the session at least once
  setUser: (u: SessionUser | null) => void;
  setHydrated: (v: boolean) => void;
  logout: () => Promise<void>;
  isOwner: () => boolean;
}

/**
 * In-memory mirror of the Supabase auth session joined with the
 * `profiles` row. Populated by <SupabaseSessionSync /> on mount and on
 * every `onAuthStateChange` event. Supabase owns the persistent session
 * (localStorage); this store only reflects it to React.
 */
export const useAuthStore = create<AuthState>()((set, get) => ({
  currentUser: null,
  hydrated: false,
  setUser: (u) => set({ currentUser: u }),
  setHydrated: (v) => set({ hydrated: v }),
  logout: async () => {
    await supabase().auth.signOut();
    set({ currentUser: null });
  },
  isOwner: () => get().currentUser?.role === 'owner',
}));
