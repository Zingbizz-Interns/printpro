'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCustomerAuthStore } from '@/lib/auth/customer-store';
import { getMyProfile, updateMyProfile } from '@/lib/db/customer-profiles';

interface Pref {
  key: string;
  label: string;
  help: string;
  transactional?: boolean;
  /** Default when the stored value is undefined. Transactional = true. */
  defaultValue: boolean;
}

const PREFS: Pref[] = [
  {
    key: 'proof_ready',
    label: 'Proof ready for review',
    help: "When we upload a new design proof, we'll email you so nothing prints until you approve.",
    transactional: true,
    defaultValue: true,
  },
  {
    key: 'ready_for_pickup',
    label: 'Ready for pickup',
    help: "When your order is ready to collect.",
    transactional: true,
    defaultValue: true,
  },
  {
    key: 'delivered_receipt',
    label: 'Delivery receipt',
    help: "A copy of your invoice once we mark the job delivered.",
    defaultValue: true,
  },
  {
    key: 'feedback_request',
    label: 'Feedback request',
    help: "An optional one-tap rating after we deliver.",
    defaultValue: true,
  },
];

export default function EmailPreferencesPage() {
  const user = useCustomerAuthStore((s) => s.currentUser);
  const qc = useQueryClient();

  const profileQ = useQuery({
    queryKey: ['portal-profile', user?.id],
    queryFn: () => getMyProfile(user!.id),
    enabled: Boolean(user?.id),
  });

  const defaults = useMemo(() => {
    const stored = (profileQ.data?.email_prefs ?? {}) as Record<string, boolean>;
    const next: Record<string, boolean> = {};
    for (const p of PREFS) next[p.key] = stored[p.key] ?? p.defaultValue;
    return next;
  }, [profileQ.data]);

  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [savedTick, setSavedTick] = useState(false);
  const prefs = { ...defaults, ...overrides };

  const save = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('not signed in');
      return updateMyProfile(user.id, { email_prefs: prefs });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-profile', user?.id] });
      setOverrides({});
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 1800);
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href="/portal/account"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Account
        </Link>
      </div>

      <div>
        <h1 className="font-display text-3xl tracking-tight">Email preferences</h1>
        <p className="mt-1 text-muted-foreground">
          Choose which updates we send to your inbox.
        </p>
      </div>

      <Card>
        <CardBody className="p-0 divide-y divide-border">
          {PREFS.map((p) => {
            const checked = prefs[p.key] ?? p.defaultValue;
            return (
              <label
                key={p.key}
                className="flex items-start gap-4 p-5 cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-foreground"
                  checked={checked}
                  onChange={(e) =>
                    setOverrides((prev) => ({ ...prev, [p.key]: e.target.checked }))
                  }
                />
                <div className="min-w-0">
                  <div className="font-medium flex items-center gap-2">
                    {p.label}
                    {p.transactional && (
                      <span className="text-[10px] font-mono uppercase tracking-widest rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                        transactional
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{p.help}</div>
                </div>
              </label>
            );
          })}
        </CardBody>
      </Card>

      <p className="text-xs text-muted-foreground">
        Transactional emails (order updates, ready-for-pickup) may still
        be sent when they&apos;re needed to fulfil your job — we&apos;ll never
        spam you, and you can reply to any message to reach us.
      </p>

      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          size="sm"
          onClick={() => save.mutate()}
          disabled={save.isPending || !profileQ.data}
        >
          {save.isPending ? 'Saving…' : 'Save preferences'}
        </Button>
        {savedTick && (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-700">
            <Check size={14} /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
