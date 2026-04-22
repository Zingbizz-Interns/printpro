'use client';

import { supabase } from '@/lib/supabase/client';
import type { PortalEvent } from '@/lib/email/events';

/**
 * Client-side helper: ask the server to dispatch a portal email event.
 * Best-effort — swallows errors so a failed notification never breaks
 * the UI flow that triggered it. The DB state is the source of truth;
 * the email is a nice-to-have.
 */
export async function triggerPortalEvent(event: PortalEvent): Promise<void> {
  try {
    const { data } = await supabase().auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch('/api/portal/dispatch', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ event }),
    });
  } catch {
    /* notification failures are non-fatal */
  }
}
