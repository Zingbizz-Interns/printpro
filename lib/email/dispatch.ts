import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from './send';
import type { PortalEvent } from './events';

export type { PortalEvent };

/**
 * Central event → email registry. Every portal email goes through
 * `dispatchPortalEvent` so we have a single place for:
 *   * recipient resolution
 *   * 60-second debounce (via `email_log`)
 *   * send-attempt logging (errors included)
 *
 * The dispatcher is designed to run inside a route handler under the
 * caller's JWT — RLS decides what the caller can read. Customers can
 * fire events on their own jobs; staff can fire events on any job.
 */

const DEBOUNCE_SECONDS = 60;

interface DispatchResult {
  ok: boolean;
  skipped?: Skip;
  error?: string;
}

type Skip = 'debounced' | 'no-recipient' | 'no-op' | 'opted-out';

/** Customer-facing event → `customer_profiles.email_prefs` key. Staff
 *  notifications are not listed; they bypass prefs. */
const CUSTOMER_PREF_KEYS: Partial<Record<PortalEvent['type'], string>> = {
  'proof-ready': 'proof_ready',
  'ready-for-pickup': 'ready_for_pickup',
  delivered: 'delivered_receipt',
};

export async function dispatchPortalEvent(
  sb: SupabaseClient,
  event: PortalEvent,
  origin: string,
): Promise<DispatchResult> {
  const key = debounceKey(event);

  // Debounce: skip if we already logged a matching row in the last
  // 60 seconds. We check even on failures — retrying a bad recipient
  // every save burns quota.
  const since = new Date(Date.now() - DEBOUNCE_SECONDS * 1000).toISOString();
  const { data: recent } = await sb
    .from('email_log')
    .select('id')
    .eq('debounce_key', key)
    .gte('sent_at', since)
    .limit(1);
  if (recent && recent.length > 0) {
    return { ok: true, skipped: 'debounced' };
  }

  // Resolve + send.
  try {
    const resolved = await resolveAndSend(sb, event, origin);
    if (resolved.skipped) {
      await logSend(sb, event, key, null, `skipped: ${resolved.skipped}`);
      return { ok: true, skipped: resolved.skipped };
    }
    await logSend(sb, event, key, resolved.to ?? null, null);
    return { ok: true };
  } catch (e) {
    const msg = (e as Error).message || String(e);
    await logSend(sb, event, key, null, msg);
    return { ok: false, error: msg };
  }
}

function debounceKey(e: PortalEvent): string {
  switch (e.type) {
    case 'welcome':
      return `welcome:${e.customerUserId}`;
    case 'proof-ready':
      return `proof-ready:${e.jobItemId}`;
    case 'proof-approved':
      return `proof-approved:${e.reviewId}`;
    case 'proof-changes-requested':
      return `proof-changes-requested:${e.reviewId}`;
    case 'ready-for-pickup':
      return `ready-for-pickup:${e.jobId}`;
    case 'delivered':
      return `delivered:${e.jobId}`;
    case 'quote-requested':
      return `quote-requested:${e.jobId}`;
  }
}

async function resolveAndSend(
  sb: SupabaseClient,
  event: PortalEvent,
  origin: string,
): Promise<{ to?: string; skipped?: Skip }> {
  const shopInbox = process.env.EMAIL_OWNER || process.env.EMAIL_REPLY_TO || '';

  if (event.type === 'welcome') {
    // Trust the email / name passed in from the signup response —
    // avoids racing the `handle_new_customer_user()` trigger's
    // replication of the new customer_profiles row.
    const to = (event.email || '').trim();
    if (!to) return { skipped: 'no-recipient' };
    await sendEmail({
      to,
      template: 'welcome',
      data: { name: event.name || '', portalUrl: `${origin}/portal` },
    });
    return { to };
  }

  if (event.type === 'proof-ready') {
    const { data: item } = await sb
      .from('job_items')
      .select('id, description, category, size, material, finishing, job_order_id, image_url')
      .eq('id', event.jobItemId)
      .maybeSingle();
    if (!item) return { skipped: 'no-op' };
    if (!item.image_url) return { skipped: 'no-op' };

    const { data: job } = await sb
      .from('job_orders')
      .select('id, job_no, email_id, customer_user_id, company_name')
      .eq('id', item.job_order_id as number)
      .maybeSingle();
    if (!job) return { skipped: 'no-op' };

    if (await customerOptedOut(sb, job, 'proof-ready')) {
      return { skipped: 'opted-out' };
    }

    const to = await resolveCustomerEmail(sb, job);
    if (!to) return { skipped: 'no-recipient' };

    const name = await resolveCustomerName(sb, job);
    await sendEmail({
      to,
      template: 'proof-ready',
      data: {
        customerName: name,
        jobNo: job.job_no as number,
        itemDescription: itemDescriptionOf(item as ItemLike),
        portalJobUrl: `${origin}/portal/orders/${job.id}`,
      },
    });
    return { to };
  }

  if (event.type === 'proof-approved' || event.type === 'proof-changes-requested') {
    if (!shopInbox) return { skipped: 'no-recipient' };

    const { data: review } = await sb
      .from('proof_reviews')
      .select('id, decision, comment, job_item_id, customer_user_id')
      .eq('id', event.reviewId)
      .maybeSingle();
    if (!review) return { skipped: 'no-op' };

    const wantsApproved = event.type === 'proof-approved';
    const wantsChanges = event.type === 'proof-changes-requested';
    if (wantsApproved && review.decision !== 'approved') return { skipped: 'no-op' };
    if (wantsChanges && review.decision !== 'changes_requested') return { skipped: 'no-op' };

    const { data: item } = await sb
      .from('job_items')
      .select('id, description, category, size, material, finishing, job_order_id')
      .eq('id', review.job_item_id as number)
      .maybeSingle();
    if (!item) return { skipped: 'no-op' };
    const { data: job } = await sb
      .from('job_orders')
      .select('id, job_no, company_name')
      .eq('id', item.job_order_id as number)
      .maybeSingle();
    if (!job) return { skipped: 'no-op' };

    const { data: customer } = await sb
      .from('customer_profiles')
      .select('name, company_name')
      .eq('id', review.customer_user_id as string)
      .maybeSingle();

    const staffJobUrl = `${origin}/jobs/${job.id}`;
    const itemDescription = itemDescriptionOf(item as ItemLike);

    if (wantsApproved) {
      await sendEmail({
        to: shopInbox,
        template: 'proof-approved',
        data: {
          customerName: (customer?.name as string) || '',
          companyName: (customer?.company_name as string) || (job.company_name as string) || '',
          jobNo: job.job_no as number,
          itemDescription,
          staffJobUrl,
        },
      });
    } else {
      await sendEmail({
        to: shopInbox,
        template: 'proof-changes-requested',
        data: {
          customerName: (customer?.name as string) || '',
          companyName: (customer?.company_name as string) || (job.company_name as string) || '',
          jobNo: job.job_no as number,
          itemDescription,
          comment: (review.comment as string) || '',
          staffJobUrl,
        },
      });
    }
    return { to: shopInbox };
  }

  if (event.type === 'ready-for-pickup') {
    const { data: job } = await sb
      .from('job_orders')
      .select(
        'id, job_no, email_id, customer_user_id, company_name, advance_paid, discount_pct, gst_enabled, job_status',
      )
      .eq('id', event.jobId)
      .maybeSingle();
    if (!job) return { skipped: 'no-op' };
    if (job.job_status !== 'Ready for Delivery') return { skipped: 'no-op' };

    if (await customerOptedOut(sb, job, 'ready-for-pickup')) {
      return { skipped: 'opted-out' };
    }

    const to = await resolveCustomerEmail(sb, job);
    if (!to) return { skipped: 'no-recipient' };
    const name = await resolveCustomerName(sb, job);

    const { data: items } = await sb
      .from('job_items')
      .select('id, quantity, rate')
      .eq('job_order_id', job.id as number);
    const itemCount = (items ?? []).length;

    const subtotal = (items ?? []).reduce(
      (s, it) => s + (Number(it.quantity) || 0) * (Number(it.rate) || 0),
      0,
    );
    const discount = subtotal * (Number(job.discount_pct) || 0) / 100;
    const afterDisc = subtotal - discount;
    const gst = job.gst_enabled ? afterDisc * 0.18 : 0;
    const total = afterDisc + gst;
    const { data: partials } = await sb
      .from('partial_payments')
      .select('amount')
      .eq('job_order_id', job.id as number);
    const paid =
      (Number(job.advance_paid) || 0) +
      (partials ?? []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const balance = Math.max(total - paid, 0);
    const balanceLine =
      balance > 0
        ? `Balance due on pickup: ₹${balance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
        : null;

    await sendEmail({
      to,
      template: 'ready-for-pickup',
      data: {
        customerName: name,
        jobNo: job.job_no as number,
        itemCount,
        balanceLine,
        portalJobUrl: `${origin}/portal/orders/${job.id}`,
      },
    });
    return { to };
  }

  if (event.type === 'delivered') {
    // Receipt email — stretch. For now, no-op so the hook is wired.
    return { skipped: 'no-op' };
  }

  if (event.type === 'quote-requested') {
    if (!shopInbox) return { skipped: 'no-recipient' };

    const { data: job } = await sb
      .from('job_orders')
      .select('id, job_no, company_name, special_notes, delivery_date, customer_user_id, job_status')
      .eq('id', event.jobId)
      .maybeSingle();
    if (!job) return { skipped: 'no-op' };
    // Only notify for Pending Review jobs — anything else would be
    // a stray event or a reclassified job.
    if (job.job_status !== 'Pending Review') return { skipped: 'no-op' };

    const { data: items } = await sb
      .from('job_items')
      .select('category, description, size, material, finishing, quantity, unit, sort_order')
      .eq('job_order_id', job.id as number)
      .order('sort_order');

    const itemLines = (items ?? []).map((it) => {
      const parts = [
        it.category,
        it.description,
        it.size,
        it.material,
        it.finishing,
      ]
        .map((p) => (p || '').toString().trim())
        .filter(Boolean);
      const qty = `${it.quantity ?? ''}`.trim();
      const unit = `${it.unit ?? ''}`.trim();
      const qtyStr = qty ? `${qty}${unit ? ' ' + unit : ''}` : '';
      return [qtyStr, parts.join(' · ') || '(unnamed item)'].filter(Boolean).join(' × ');
    });

    const { data: customer } = job.customer_user_id
      ? await sb
          .from('customer_profiles')
          .select('name, company_name')
          .eq('id', job.customer_user_id)
          .maybeSingle()
      : { data: null };

    const notes = stripQuoteRequestPrefix((job.special_notes as string) || '');

    await sendEmail({
      to: shopInbox,
      template: 'quote-requested',
      data: {
        customerName: (customer?.name as string) || '',
        companyName: (customer?.company_name as string) || (job.company_name as string) || '',
        jobNo: job.job_no as number,
        itemLines,
        deliveryDate: (job.delivery_date as string) || null,
        notes,
        staffJobUrl: `${origin}/jobs/${job.id}`,
      },
    });
    return { to: shopInbox };
  }

  return { skipped: 'no-op' };
}

function stripQuoteRequestPrefix(note: string): string {
  // special_notes always starts with "Quote request from portal." or
  // "Reordered by customer from job #…" — drop the first line so the
  // email only shows the customer's actual message.
  const [first, ...rest] = note.split(/\r?\n/);
  if (/^(Quote request from portal|Reordered by customer)/.test(first || '')) {
    return rest.join('\n').trim();
  }
  return note;
}

async function customerOptedOut(
  sb: SupabaseClient,
  job: { customer_user_id?: string | null },
  eventType: PortalEvent['type'],
): Promise<boolean> {
  // Unlinked jobs (no customer_profiles row) can't have prefs — the
  // fallback flow uses job_orders.email_id. Send by default.
  if (!job.customer_user_id) return false;
  const prefKey = CUSTOMER_PREF_KEYS[eventType];
  if (!prefKey) return false;
  const { data } = await sb
    .from('customer_profiles')
    .select('email_prefs')
    .eq('id', job.customer_user_id)
    .maybeSingle();
  const prefs = (data?.email_prefs ?? {}) as Record<string, boolean>;
  // Missing key defaults to opted-in.
  return prefs[prefKey] === false;
}

async function resolveCustomerEmail(
  sb: SupabaseClient,
  job: { customer_user_id?: string | null; email_id?: string | null },
): Promise<string | null> {
  if (job.customer_user_id) {
    const { data } = await sb
      .from('customer_profiles')
      .select('email')
      .eq('id', job.customer_user_id)
      .maybeSingle();
    if (data?.email) return data.email as string;
  }
  const fallback = (job.email_id || '').trim();
  return fallback || null;
}

async function resolveCustomerName(
  sb: SupabaseClient,
  job: { customer_user_id?: string | null },
): Promise<string> {
  if (!job.customer_user_id) return '';
  const { data } = await sb
    .from('customer_profiles')
    .select('name')
    .eq('id', job.customer_user_id)
    .maybeSingle();
  return (data?.name as string) || '';
}

interface ItemLike {
  description?: string;
  category?: string;
  size?: string;
  material?: string;
  finishing?: string;
}

function itemDescriptionOf(item: ItemLike): string {
  const parts = [item.category, item.description, item.size, item.material, item.finishing]
    .map((p) => (p || '').trim())
    .filter(Boolean);
  return parts.join(' · ') || '(unnamed item)';
}

async function logSend(
  sb: SupabaseClient,
  event: PortalEvent,
  key: string,
  toEmail: string | null,
  error: string | null,
): Promise<void> {
  const row: Record<string, unknown> = {
    event: event.type,
    debounce_key: key,
    to_email: toEmail,
    error,
  };
  if ('customerUserId' in event) row.customer_user_id = event.customerUserId;
  if ('jobId' in event) row.job_id = event.jobId;
  if ('jobItemId' in event) row.job_item_id = event.jobItemId;
  const { error: insertErr } = await sb.from('email_log').insert(row);
  if (insertErr) {
    // Last-ditch visibility — the route logs it, operator can grep.
    console.error('[email_log insert failed]', insertErr.message, row);
  }
}
