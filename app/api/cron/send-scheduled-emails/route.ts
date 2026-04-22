import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/send';

export const runtime = 'nodejs';

/**
 * Cron endpoint that drains `public.pending_emails`. Hit it every few
 * minutes — Vercel Cron, Supabase scheduled edge function, or an
 * external uptime/ping service all work.
 *
 * Auth: bearer token in the `authorization` header, compared against
 * `CRON_SECRET`. No token or mismatched token → 401.
 *
 * Runs with the Supabase service-role key so it bypasses RLS. The only
 * v1 consumer is `feedback-request`; extending for other scheduled
 * events means adding a case to `handlers` below.
 *
 * Best-effort: failures stamp `last_error` + bump `attempts`, success
 * stamps `sent_at`. We don't retry inside the handler — the next cron
 * tick picks the row up again (bounded by a MAX_ATTEMPTS ceiling).
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET || '';

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 50;

interface PendingRow {
  id: number;
  event_type: string;
  job_order_id: number | null;
  customer_user_id: string | null;
  payload: Record<string, unknown>;
  send_after: string;
  sent_at: string | null;
  attempts: number;
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  // Vercel Cron hits GET by default — support both verbs.
  return handle(request);
}

async function handle(request: Request) {
  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not set' }, { status: 500 });
  }
  const auth = request.headers.get('authorization') || '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : '';
  if (!token || token !== CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' },
      { status: 500 },
    );
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const origin = new URL(request.url).origin;

  const { data: rows, error } = await sb
    .from('pending_emails')
    .select('id, event_type, job_order_id, customer_user_id, payload, send_after, sent_at, attempts')
    .is('sent_at', null)
    .lte('send_after', new Date().toISOString())
    .lt('attempts', MAX_ATTEMPTS)
    .order('send_after', { ascending: true })
    .limit(BATCH_SIZE);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const pending = (rows ?? []) as PendingRow[];
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of pending) {
    try {
      const outcome = await dispatchScheduled(sb, row, origin);
      if (outcome === 'sent') sent++;
      else skipped++;
      await sb
        .from('pending_emails')
        .update({ sent_at: new Date().toISOString(), last_error: null })
        .eq('id', row.id);
    } catch (e) {
      failed++;
      const msg = (e as Error).message || String(e);
      await sb
        .from('pending_emails')
        .update({ attempts: row.attempts + 1, last_error: msg })
        .eq('id', row.id);
      await logAttempt(sb, row, null, msg);
    }
  }

  return NextResponse.json({
    ok: true,
    considered: pending.length,
    sent,
    skipped,
    failed,
  });
}

type Outcome = 'sent' | 'skipped';

async function dispatchScheduled(
  sb: SupabaseClient,
  row: PendingRow,
  origin: string,
): Promise<Outcome> {
  if (row.event_type === 'feedback-request') {
    return handleFeedbackRequest(sb, row, origin);
  }
  // Unknown event — mark sent to stop re-processing, but log it.
  await logAttempt(sb, row, null, `unknown event_type: ${row.event_type}`);
  return 'skipped';
}

async function handleFeedbackRequest(
  sb: SupabaseClient,
  row: PendingRow,
  origin: string,
): Promise<Outcome> {
  if (!row.job_order_id || !row.customer_user_id) {
    await logAttempt(sb, row, null, 'missing job_order_id / customer_user_id');
    return 'skipped';
  }

  const { data: job } = await sb
    .from('job_orders')
    .select('id, job_no, job_status, customer_user_id, email_id')
    .eq('id', row.job_order_id)
    .maybeSingle();
  if (!job) {
    await logAttempt(sb, row, null, 'job_order not found');
    return 'skipped';
  }
  // If the job has since been taken out of Delivered, skip the ping.
  if (job.job_status !== 'Delivered') {
    await logAttempt(sb, row, null, `skipped: job_status=${job.job_status}`);
    return 'skipped';
  }

  const { data: profile } = await sb
    .from('customer_profiles')
    .select('email, name, email_prefs')
    .eq('id', row.customer_user_id)
    .maybeSingle();
  if (!profile) {
    await logAttempt(sb, row, null, 'customer_profile not found');
    return 'skipped';
  }
  const prefs = (profile.email_prefs ?? {}) as Record<string, boolean>;
  if (prefs.feedback_request === false) {
    await logAttempt(sb, row, null, 'skipped: opted-out');
    return 'skipped';
  }

  const to = ((profile.email as string) || (job.email_id as string) || '').trim();
  if (!to) {
    await logAttempt(sb, row, null, 'no recipient');
    return 'skipped';
  }

  // Check for existing feedback — if the customer already rated, no
  // need to nudge. Still stamp sent_at so we don't retry.
  const { data: existing } = await sb
    .from('job_feedback')
    .select('id')
    .eq('job_order_id', row.job_order_id)
    .maybeSingle();
  if (existing) {
    await logAttempt(sb, row, null, 'skipped: feedback already submitted');
    return 'skipped';
  }

  await sendEmail({
    to,
    template: 'feedback-request',
    data: {
      customerName: (profile.name as string) || '',
      jobNo: job.job_no as number,
      feedbackUrl: `${origin}/portal/orders/${job.id}/feedback`,
    },
  });

  await logAttempt(sb, row, to, null);
  return 'sent';
}

async function logAttempt(
  sb: SupabaseClient,
  row: PendingRow,
  toEmail: string | null,
  error: string | null,
): Promise<void> {
  await sb.from('email_log').insert({
    event: row.event_type,
    debounce_key: `${row.event_type}:${row.job_order_id ?? 'n/a'}`,
    customer_user_id: row.customer_user_id,
    job_id: row.job_order_id,
    to_email: toEmail,
    error,
  });
}
