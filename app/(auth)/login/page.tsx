'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { supabase } from '@/lib/supabase/client';
import { resolveRoleDestination } from '@/lib/auth/resolve-role';

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  // If the user is already signed in, send them to their role's landing.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase().auth.getSession();
      if (cancelled) return;
      if (session?.user?.id) {
        const dest = await resolveRoleDestination(session.user.id);
        if (cancelled) return;
        if (dest) {
          router.replace(dest);
          return;
        }
      }
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function submit() {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data, error: signInErr } = await supabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInErr || !data.user) {
        setError(signInErr?.message || 'Sign in failed.');
        setPassword('');
        return;
      }
      const dest = await resolveRoleDestination(data.user.id);
      if (!dest) {
        await supabase().auth.signOut();
        setError(
          "This account isn't linked to a staff role or customer profile. Contact support.",
        );
        return;
      }
      router.replace(dest);
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <main className="min-h-screen grid place-items-center">
        <span className="font-display text-2xl animate-pulse">loading…</span>
      </main>
    );
  }

  return (
    <main className="min-h-screen grid place-items-center px-6 py-12 bg-muted/30">
      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <div className="bg-foreground text-white px-4 py-1.5 rounded-full font-body font-bold text-sm tracking-widest uppercase shadow-sm">
            S Prints
          </div>
        </div>

        <Card className="p-8 shadow-2xl border-border rounded-[2rem] backdrop-blur-xl bg-background">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-3xl font-body font-bold tracking-tight">Welcome Back</CardTitle>
            <p className="text-muted-foreground mt-2 font-medium">Sign in to your account.</p>
          </CardHeader>

          <CardBody>
            <div className="space-y-5">
              <div>
                <Label htmlFor="email" className="font-semibold px-1">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  autoFocus
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
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder="Your password"
                  className="mt-1.5 shadow-inner"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 font-semibold mb-4 text-sm flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-top-2">
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
                  {busy ? 'Signing in…' : 'Sign In'}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        <p className="mt-8 text-center text-sm text-muted-foreground font-medium">
          New customer?{' '}
          <Link href="/portal/signup" className="text-accent font-semibold hover:underline">
            Create an account
          </Link>
        </p>

        {/* Decorative background elements */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[120px]" />
          <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px]" />
        </div>
      </div>
    </main>
  );
}
