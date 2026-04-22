'use client';

import { useEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

/**
 * Mounts the single `print-pro-changes` channel. Any change to
 * job_orders / job_items / customers / partial_payments invalidates the
 * matching TanStack Query caches so every mounted view refetches.
 *
 * Returns a `status` string for the live indicator ('SUBSCRIBED' when active).
 *
 * Payments are subscribed so that balance/payment-status shown on the
 * kanban stays in sync when another device records a payment.
 */
export function useRealtimeSync(onStatus?: (s: string) => void): void {
  const qc = useQueryClient();

  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    const sb = supabase();

    channel = sb
      .channel('print-pro-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_orders' },
        () => {
          qc.invalidateQueries({ queryKey: ['jobs'] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_items' },
        () => {
          qc.invalidateQueries({ queryKey: ['jobs'] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        () => {
          qc.invalidateQueries({ queryKey: ['customers'] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'partial_payments' },
        (payload) => {
          qc.invalidateQueries({ queryKey: ['jobs'] });
          const row = (payload.new ?? payload.old) as { job_order_id?: number } | null;
          const jobId = row?.job_order_id;
          if (typeof jobId === 'number') {
            qc.invalidateQueries({ queryKey: ['payments', jobId] });
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'proof_reviews' },
        () => {
          qc.invalidateQueries({ queryKey: ['proof-reviews'] });
          qc.invalidateQueries({ queryKey: ['staff-job-reviews'] });
          qc.invalidateQueries({ queryKey: ['jobs'] });
        },
      )
      .subscribe((status) => {
        onStatus?.(status);
      });

    return () => {
      if (channel) sb.removeChannel(channel);
    };
  }, [qc, onStatus]);
}
