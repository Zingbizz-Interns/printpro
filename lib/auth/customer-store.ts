'use client';

import { create } from 'zustand';
import type { CustomerSessionUser } from '@/types/db';
import { supabase } from '@/lib/supabase/client';

interface CustomerAuthState {
  currentUser: CustomerSessionUser | null;
  hydrated: boolean;
  setUser: (u: CustomerSessionUser | null) => void;
  setHydrated: (v: boolean) => void;
  logout: () => Promise<void>;
}

/**
 * Parallel to useAuthStore (staff). Mounted only inside the /portal
 * route tree. Populated by <CustomerSessionSync /> on mount and on
 * onAuthStateChange events. Both stores share the same Supabase auth
 * session — a signed-in user only populates the store whose profile
 * table matches (profiles for staff, customer_profiles for customers).
 */
export const useCustomerAuthStore = create<CustomerAuthState>()((set) => ({
  currentUser: null,
  hydrated: false,
  setUser: (u) => set({ currentUser: u }),
  setHydrated: (v) => set({ hydrated: v }),
  logout: async () => {
    await supabase().auth.signOut();
    set({ currentUser: null });
  },
}));
