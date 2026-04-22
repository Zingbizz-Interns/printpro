'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { supabase } from '@/lib/supabase/client';
import { useCustomerAuthStore } from '@/lib/auth/customer-store';
import { triggerPortalEvent } from '@/lib/email/client';

export default function PortalSignup() {
  const router = useRouter();
  const user = useCustomerAuthStore((s) => s.currentUser);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Email confirmation is disabled in Supabase; signUp returns a live
    // session, CustomerSessionSync hydrates the store, and we land here.
    if (user) router.replace('/portal');
  }, [user, router]);

  async function submit() {
    if (!name.trim() || !email.trim() || !password) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data: signUpData, error: signUpErr } = await supabase().auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
            // Flag read by the handle_new_customer_user() trigger to
            // decide whether to create a customer_profiles row.
            portal: 'true',
          },
        },
      });
      if (signUpErr) {
        setError(signUpErr.message || 'Sign up failed.');
        return;
      }
      // Session is live; the effect above will redirect once the store
      // hydrates via onAuthStateChange.
      const newUser = signUpData?.user;
      if (newUser?.id && newUser.email) {
        // Pass email/name through so the dispatcher doesn't race the
        // handle_new_customer_user() trigger's row-creation.
        await triggerPortalEvent({
          type: 'welcome',
          customerUserId: newUser.id,
          email: newUser.email,
          name: name.trim(),
        });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center px-6 py-12 bg-muted/30">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-foreground text-white px-4 py-1.5 rounded-full font-body font-bold text-sm tracking-widest uppercase shadow-sm">
            S Prints · Customer
          </div>
        </div>

        <Card className="p-8 shadow-2xl border-border rounded-[2rem] bg-background">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-3xl font-body font-bold tracking-tight">Create account</CardTitle>
            <p className="text-muted-foreground mt-2 font-medium">Track your print jobs online.</p>
          </CardHeader>

          <CardBody>
            <div className="space-y-5">
              <div>
                <Label htmlFor="name" className="font-semibold px-1">Name</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  autoFocus
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(null); }}
                  placeholder="Your full name"
                  className="mt-1.5 shadow-inner"
                />
              </div>
              <div>
                <Label htmlFor="email" className="font-semibold px-1">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  placeholder="you@company.com"
                  className="mt-1.5 shadow-inner"
                />
              </div>
              <div>
                <Label htmlFor="pw" className="font-semibold px-1">Password</Label>
                <Input
                  id="pw"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder="Minimum 8 characters"
                  className="mt-1.5 shadow-inner"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 font-semibold text-sm flex items-center gap-2">
                  <span className="text-red-500">✗</span> {error}
                </div>
              )}

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={submit}
                  disabled={busy}
                  className="w-full shadow-lg"
                >
                  {busy ? 'Creating account…' : 'Create account'}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        <p className="mt-8 text-center text-sm text-muted-foreground font-medium">
          Already have an account?{' '}
          <Link href="/login" className="text-accent font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
