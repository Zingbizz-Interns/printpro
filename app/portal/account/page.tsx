'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, Check, Mail, ChevronRight } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input, Label, Textarea } from '@/components/ui/input';
import { useCustomerAuthStore } from '@/lib/auth/customer-store';
import {
  getMyProfile,
  updateMyProfile,
  type CustomerProfileUpdate,
} from '@/lib/db/customer-profiles';
import {
  getSignedGstCertificateUrl,
  uploadGstCertificate,
} from '@/lib/db/storage';
import { supabase } from '@/lib/supabase/client';
import type { CustomerProfileRow } from '@/types/db';

export default function AccountPage() {
  const user = useCustomerAuthStore((s) => s.currentUser);
  const qc = useQueryClient();

  const profileQ = useQuery({
    queryKey: ['portal-profile', user?.id],
    queryFn: () => getMyProfile(user!.id),
    enabled: Boolean(user?.id),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Account</h1>
        <p className="mt-1 text-muted-foreground">Your details and documents on file.</p>
      </div>

      {profileQ.isLoading && (
        <div className="py-16 text-center text-muted-foreground animate-pulse">Loading…</div>
      )}

      {profileQ.isSuccess && profileQ.data && (
        <>
          <ProfileForm
            profile={profileQ.data}
            onSaved={() => qc.invalidateQueries({ queryKey: ['portal-profile', user?.id] })}
          />
          <GstCertificateCard
            profile={profileQ.data}
            onChange={() => qc.invalidateQueries({ queryKey: ['portal-profile', user?.id] })}
          />
          <PasswordCard />
          <Link
            href="/portal/account/email-preferences"
            className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Mail size={18} className="text-muted-foreground" />
              <div>
                <div className="font-medium">Email preferences</div>
                <div className="text-xs text-muted-foreground">
                  Choose which updates land in your inbox.
                </div>
              </div>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </Link>
        </>
      )}
    </div>
  );
}

function ProfileForm({
  profile,
  onSaved,
}: {
  profile: CustomerProfileRow;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: profile.name || '',
    company_name: profile.company_name || '',
    contact_number: profile.contact_number || '',
    gst_no: profile.gst_no || '',
    billing_address: profile.billing_address || '',
  });
  const [saved, setSaved] = useState(false);

  const mut = useMutation({
    mutationFn: async (patch: CustomerProfileUpdate) => updateMyProfile(profile.id, patch),
    onSuccess: () => {
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 2000);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your details</CardTitle>
      </CardHeader>
      <CardBody>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate(form);
          }}
          className="grid gap-4 md:grid-cols-2"
        >
          <Field label="Full name">
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field label="Company name">
            <Input
              value={form.company_name}
              onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
            />
          </Field>
          <Field label="Contact number">
            <Input
              value={form.contact_number}
              onChange={(e) => setForm((f) => ({ ...f, contact_number: e.target.value }))}
              placeholder="+91 98765 43210"
            />
          </Field>
          <Field label="GSTIN">
            <Input
              value={form.gst_no}
              onChange={(e) => setForm((f) => ({ ...f, gst_no: e.target.value.toUpperCase() }))}
              placeholder="29ABCDE1234F1Z5"
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Billing address">
              <Textarea
                rows={3}
                value={form.billing_address}
                onChange={(e) => setForm((f) => ({ ...f, billing_address: e.target.value }))}
              />
            </Field>
          </div>

          <div className="md:col-span-2 flex items-center gap-3">
            <Button type="submit" variant="primary" size="sm" disabled={mut.isPending}>
              {mut.isPending ? 'Saving…' : 'Save changes'}
            </Button>
            {saved && (
              <span className="inline-flex items-center gap-1 text-sm text-emerald-700">
                <Check size={14} /> Saved
              </span>
            )}
            {mut.isError && (
              <span className="text-sm text-red-600">
                {(mut.error as Error).message || 'Could not save.'}
              </span>
            )}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function GstCertificateCard({
  profile,
  onChange,
}: {
  profile: CustomerProfileRow;
  onChange: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!profile.gst_certificate_url) {
      setSignedUrl(null);
      return;
    }
    (async () => {
      try {
        const url = await getSignedGstCertificateUrl(profile.gst_certificate_url!);
        if (!cancelled) setSignedUrl(url);
      } catch {
        if (!cancelled) setSignedUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile.gst_certificate_url]);

  async function onPickFile(file: File | null) {
    if (!file) return;
    const okTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!okTypes.includes(file.type)) {
      setError('Use a PDF, JPG, or PNG file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File must be under 5 MB.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const path = await uploadGstCertificate(profile.id, file);
      await updateMyProfile(profile.id, { gst_certificate_url: path });
      onChange();
    } catch (err) {
      setError((err as Error).message || 'Upload failed.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>GST certificate</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        {profile.gst_certificate_url ? (
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-muted-foreground" />
              <div>
                <div className="font-medium text-sm">On file</div>
                <div className="text-xs text-muted-foreground truncate max-w-[12rem]">
                  {profile.gst_certificate_url.split('/').pop()}
                </div>
              </div>
            </div>
            {signedUrl && (
              <a
                href={signedUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-sm text-accent hover:underline"
              >
                View
              </a>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No certificate uploaded yet. We&apos;ll use this on your invoices.
          </p>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
        />
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            <Upload size={14} /> {profile.gst_certificate_url ? 'Replace' : 'Upload'}
          </Button>
          {busy && <span className="text-sm text-muted-foreground animate-pulse">Uploading…</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </CardBody>
    </Card>
  );
}

function PasswordCard() {
  const email = useCustomerAuthStore((s) => s.currentUser?.email);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [saved, setSaved] = useState(false);

  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase().auth.updateUser({ password: pw });
      if (error) throw error;
    },
    onSuccess: () => {
      setPw('');
      setPw2('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const canSave = pw.length >= 8 && pw === pw2;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
      </CardHeader>
      <CardBody>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSave) mut.mutate();
          }}
          className="grid gap-4 md:grid-cols-2"
        >
          <Field label="New password">
            <Input
              type="password"
              autoComplete="new-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="At least 8 characters"
            />
          </Field>
          <Field label="Confirm password">
            <Input
              type="password"
              autoComplete="new-password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
            />
          </Field>

          <div className="md:col-span-2 flex items-center gap-3">
            <Button type="submit" variant="primary" size="sm" disabled={!canSave || mut.isPending}>
              {mut.isPending ? 'Updating…' : 'Update password'}
            </Button>
            {pw && pw !== pw2 && (
              <span className="text-sm text-amber-700">Passwords don&apos;t match.</span>
            )}
            {pw && pw.length > 0 && pw.length < 8 && (
              <span className="text-sm text-muted-foreground">Minimum 8 characters.</span>
            )}
            {saved && (
              <span className="inline-flex items-center gap-1 text-sm text-emerald-700">
                <Check size={14} /> Password updated
              </span>
            )}
            {mut.isError && (
              <span className="text-sm text-red-600">
                {(mut.error as Error).message || 'Could not update.'}
              </span>
            )}
          </div>

          <Label className="md:col-span-2 text-xs text-muted-foreground font-normal">
            Signed in as <strong>{email}</strong>
          </Label>
        </form>
      </CardBody>
    </Card>
  );
}
