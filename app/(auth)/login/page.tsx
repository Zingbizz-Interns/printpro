'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { StickyNote } from '@/components/ui/sticky-note';
import { Underline } from '@/components/decorations/squiggle';
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
    <main className="min-h-screen grid place-items-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <StickyNote tilt="l2">Print Pro · sign in</StickyNote>
        </div>

        <Card tone="paper" wobbly="alt" decoration="tape" className="p-2">
          <CardHeader>
            <CardTitle className="text-3xl">Welcome back</CardTitle>
            <div className="relative inline-block mt-1">
              <p className="text-lg text-pencil/70">Sign in with your work email.</p>
              <Underline className="absolute -bottom-2 left-0 w-24 h-2" />
            </div>
          </CardHeader>

          <CardBody>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
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
                />
              </div>
              <div>
                <Label htmlFor="pw">Password</Label>
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
                  placeholder="your password"
                />
              </div>
              {error && (
                <div className="bg-accent-lt border-2 border-accent wobbly-sm px-4 py-2 text-accent font-bold">
                  ✗ {error}
                </div>
              )}
              <div className="flex gap-3 items-center">
                <Button
                  variant="primary"
                  size="md"
                  onClick={submit}
                  disabled={busy}
                  className="ml-auto"
                >
                  {busy ? 'checking…' : 'sign in'}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        <p className="mt-8 text-center text-sm text-pencil/50 italic">
          Accounts are managed in the Supabase dashboard.
        </p>
      </div>
    </main>
  );
}
