import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { dispatchPortalEvent, type PortalEvent } from '@/lib/email/dispatch';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface Body {
  event: PortalEvent;
}

/**
 * Single entry point for portal email events. The caller (customer or
 * staff) passes a `PortalEvent` plus their bearer token; the dispatcher
 * re-reads the referenced rows under RLS (forged IDs bounce), resolves
 * the recipient, sends, and writes to `email_log`.
 *
 * Notifications are best-effort — the caller's business logic has
 * already committed to the DB before this fires.
 */
export async function POST(request: Request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : '';
  if (!token) {
    return NextResponse.json({ error: 'missing authorization' }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!body?.event?.type) {
    return NextResponse.json({ error: 'missing event.type' }, { status: 400 });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const origin = new URL(request.url).origin;

  const result = await dispatchPortalEvent(sb, body.event, origin);
  const status = result.ok ? 200 : 500;
  return NextResponse.json(result, { status });
}
