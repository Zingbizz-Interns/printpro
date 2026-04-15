'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/store';
import { Topbar } from '@/components/app-shell/topbar';
import { BottomNav } from '@/components/app-shell/bottom-nav';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.currentUser);
  const hydrated = useAuthStore((s) => s.hydrated);
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !user) router.replace('/login');
  }, [hydrated, user, router]);

  if (!hydrated || !user) {
    return (
      <div className="min-h-screen grid place-items-center">
        <span className="font-display text-2xl animate-pulse">
          {hydrated ? 'redirecting…' : 'loading session…'}
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <Topbar />
      <div className="mx-auto w-full max-w-[1800px]">{children}</div>
      <BottomNav />
    </div>
  );
}
