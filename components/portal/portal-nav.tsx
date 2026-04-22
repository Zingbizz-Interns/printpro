'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Printer, LayoutDashboard, Receipt, User, LogOut, FilePlus, Images } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCustomerAuthStore } from '@/lib/auth/customer-store';
import { useRealtimePortalSync } from '@/lib/realtime-portal';

const NAV = [
  { href: '/portal', label: 'Overview', Icon: LayoutDashboard, exact: true },
  { href: '/portal/orders', label: 'Orders', Icon: Receipt, exact: false },
  { href: '/portal/quote', label: 'New quote', Icon: FilePlus, exact: false },
  { href: '/portal/artwork', label: 'Artwork', Icon: Images, exact: false },
  { href: '/portal/account', label: 'Account', Icon: User, exact: false },
];

function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
}

function isActive(pathname: string | null, href: string, exact: boolean) {
  if (!pathname) return false;
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

export function PortalTopbar() {
  const user = useCustomerAuthStore((s) => s.currentUser);
  const logout = useCustomerAuthStore((s) => s.logout);
  const router = useRouter();
  const pathname = usePathname();
  const [rtStatus, setRtStatus] = useState<string>('CONNECTING');
  useRealtimePortalSync(user?.id, setRtStatus);

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border shadow-sm">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-6">
        <Link href="/portal" className="flex items-center gap-3 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-accent text-white shadow-accent">
            <Printer size={18} strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl tracking-tight hidden sm:block">S Prints</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV.map(({ href, label, Icon, exact }) => {
            const active = isActive(pathname, href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 font-body font-medium text-sm rounded-lg transition-all',
                  active
                    ? 'bg-muted text-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )}
              >
                <Icon size={17} strokeWidth={2} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <LiveDot status={rtStatus} />
          <div className="hidden sm:flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-white font-medium text-sm border-2 border-background shadow-sm bg-gradient-accent"
              title={user.name || user.email}
            >
              {initialsOf(user.name || user.email)}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:bg-red-50 hover:text-red-600"
            onClick={async () => {
              await logout();
              router.replace('/login');
            }}
            title="Sign out"
          >
            <LogOut size={17} />
            <span className="hidden lg:inline ml-1">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function PortalBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border shadow-[0_-4px_24px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around max-w-md mx-auto px-2 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
        {NAV.map(({ href, label, Icon, exact }) => {
          const active = isActive(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 py-1.5 px-4 text-[11px] font-body font-medium transition-colors',
                active ? 'text-accent' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 2}
                className={cn('transition-transform', active && '-translate-y-0.5')}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function LiveDot({ status }: { status: string }) {
  const on = status === 'SUBSCRIBED';
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2.5 py-1 rounded-full border text-[10px] font-mono tracking-widest uppercase',
        on ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-border bg-muted text-muted-foreground',
      )}
      title={on ? 'Realtime sync active' : `Realtime: ${status.toLowerCase()}`}
    >
      <span
        className={cn('inline-block w-2 h-2 rounded-full', on ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground')}
      />
      <span className="hidden sm:inline">{on ? 'Live' : 'Connecting'}</span>
    </div>
  );
}
