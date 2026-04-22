'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CustomerSessionSync } from '@/lib/auth/customer-session-sync';
import { useCustomerAuthStore } from '@/lib/auth/customer-store';
import { PortalBottomNav, PortalTopbar } from '@/components/portal/portal-nav';

const PUBLIC_PATHS = new Set(['/portal/signup']);

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CustomerSessionSync />
      <PortalShell>{children}</PortalShell>
    </>
  );
}

function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useCustomerAuthStore((s) => s.currentUser);
  const hydrated = useCustomerAuthStore((s) => s.hydrated);

  const isPublic = pathname ? PUBLIC_PATHS.has(pathname) : false;

  useEffect(() => {
    if (!hydrated) return;
    if (!user && !isPublic) router.replace('/login');
  }, [hydrated, user, isPublic, router]);

  if (!hydrated) {
    return (
      <div className="min-h-screen grid place-items-center">
        <span className="font-display text-2xl animate-pulse">loading…</span>
      </div>
    );
  }

  if (isPublic) return <>{children}</>;

  if (!user) {
    return (
      <div className="min-h-screen grid place-items-center">
        <span className="font-display text-2xl animate-pulse">redirecting…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <PortalTopbar />
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      <PortalBottomNav />
    </div>
  );
}
