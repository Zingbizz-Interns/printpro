'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth/store';

export default function Login() {
  const router = useRouter();
  const alreadyIn = useAuthStore((s) => s.currentUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (alreadyIn) router.replace('/kanban');
  }, [alreadyIn, router]);

  async function submit() {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: signInErr } = await supabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInErr) {
        setError(signInErr.message || 'Sign in failed.');
        setPassword('');
        return;
      }
      // SupabaseSessionSync will hydrate useAuthStore; effect above redirects.
    } finally {
      setBusy(false);
    }
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
            <p className="text-muted-foreground mt-2 font-medium">Sign in with your work email.</p>
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
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
                  {busy ? 'Verifying…' : 'Sign In'}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        <p className="mt-8 text-center text-sm text-muted-foreground font-medium">
          Accounts are managed in the Supabase dashboard.
        </p>
      </div>

      {/* Decorative background elements */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[120px]" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px]" />
      </div>
    </main>
  );
}
