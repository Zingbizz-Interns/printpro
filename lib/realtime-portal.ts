'use client';

import { useEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

/**
 * Portal-scoped realtime sync.
 *
 * Uses a channel name keyed by the customer's uuid to avoid colliding
 * with the staff `print-pro-changes` channel. Invalidates only the
 * portal query keys (`portal-jobs`, `portal-job`, `portal-payments`)
 * so staff-side caches in the same browser tab aren't thrashed.
 *
 * The postgres_changes filter is server-side — RLS ensures the
 * customer only receives events for rows they can read. No client-side
 * filter is needed, but we pass one to reduce wire traffic on
 * partial_payments where we can match on `job_order_id` via the event
 * payload.
 */
export function useRealtimePortalSync(
  customerUserId: string | null | undefined,
  onStatus?: (s: string) => void,
): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!customerUserId) return;
    let channel: RealtimeChannel | null = null;
    const sb = supabase();

    channel = sb
      .channel(`portal-changes-${customerUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_orders' },
        () => {
          qc.invalidateQueries({ queryKey: ['portal-jobs'] });
          qc.invalidateQueries({ queryKey: ['portal-job'] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_items' },
        () => {
          qc.invalidateQueries({ queryKey: ['portal-jobs'] });
          qc.invalidateQueries({ queryKey: ['portal-job'] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'partial_payments' },
        (payload) => {
          qc.invalidateQueries({ queryKey: ['portal-jobs'] });
          const row = (payload.new ?? payload.old) as { job_order_id?: number } | null;
          const jobId = row?.job_order_id;
          if (typeof jobId === 'number') {
            qc.invalidateQueries({ queryKey: ['portal-job', jobId] });
            qc.invalidateQueries({ queryKey: ['portal-payments', jobId] });
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'proof_reviews' },
        () => {
          qc.invalidateQueries({ queryKey: ['portal-job-reviews'] });
          qc.invalidateQueries({ queryKey: ['portal-job'] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customer_artwork' },
        () => {
          qc.invalidateQueries({ queryKey: ['portal-artwork'] });
        },
      )
      .subscribe((status) => {
        onStatus?.(status);
      });

    return () => {
      if (channel) sb.removeChannel(channel);
    };
  }, [customerUserId, qc, onStatus]);
}
