import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local',
  );
}

let _sb: SupabaseClient | null = null;

/**
 * Browser-side Supabase singleton. Uses Supabase Auth: session is
 * persisted to localStorage and auto-refreshed. RLS on `profiles` +
 * business tables enforces role gating server-side; `isOwner()` on the
 * client is a UX convenience, not the security boundary.
 */
export function supabase(): SupabaseClient {
  if (_sb) return _sb;
  _sb = createClient(url!, key!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return _sb;
}

export const SUPABASE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET ?? 'job-images';
