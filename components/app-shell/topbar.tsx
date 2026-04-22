'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuthStore } from '@/lib/auth/store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Printer, Users, Package, TrendingUp, FileText, LogOut } from 'lucide-react';
import { useRealtimeSync } from '@/lib/realtime';

function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Topbar() {
  const user = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const pathname = usePathname();
  const [rtStatus, setRtStatus] = useState<string>('CONNECTING');
  useRealtimeSync(setRtStatus);

  const isOwner = user?.role === 'owner';

  const nav: { href: string; label: string; Icon: typeof Printer; ownerOnly?: boolean }[] = [
    { href: '/dashboard', label: 'Dashboard', Icon: TrendingUp, ownerOnly: true },
    { href: '/kanban', label: 'Board', Icon: Printer },
    { href: '/customers', label: 'Customers', Icon: Users },
    { href: '/products', label: 'Products', Icon: Package },
    { href: '/reports', label: 'Reports', Icon: FileText, ownerOnly: true },
  ];

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border shadow-sm">
      <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-accent text-white shadow-accent">
            <Printer size={20} strokeWidth={2.5} />
          </div>
          <span className="font-display text-2xl leading-none tracking-tight hidden lg:block text-foreground mt-1">S Prints</span>
        </Link>

        {/* Separator */}
        <div className="hidden lg:block w-px h-6 bg-border mx-2" />

        <nav className="hidden md:flex items-center gap-2">
          {nav
            .filter((n) => !n.ownerOnly || isOwner)
            .map(({ href, label, Icon }) => {
              const active = pathname?.startsWith(href);
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
                  <Icon size={18} strokeWidth={2} />
                  {label}
                </Link>
              );
            })}
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-4">
          <LiveDot status={rtStatus} />
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold bg-muted px-2 py-1 rounded border border-border uppercase tracking-widest text-muted-foreground">
                {isOwner ? 'Admin' : 'Staff'}
              </span>
            </div>

            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-white font-medium text-sm border-2 border-background shadow-sm"
              style={{ background: user.color || 'var(--color-accent)' }}
              title={`${user.name} (${user.role})`}
            >
              {initialsOf(user.name)}
            </div>
          </div>

          <div className="hidden sm:block w-px h-6 bg-border mx-1" />

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground transition-all hover:bg-red-50 hover:text-red-600"
            onClick={() => {
              logout();
              router.replace('/login');
            }}
            title="Sign out"
          >
            <LogOut size={18} />
            <span className="hidden lg:inline ml-1">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

function LiveDot({ status }: { status: string }) {
  const on = status === 'SUBSCRIBED';
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-mono tracking-widest uppercase shadow-sm transition-colors',
        on ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-border bg-muted text-muted-foreground',
      )}
      title={on ? 'Realtime sync active' : `Realtime: ${status.toLowerCase()}`}
    >
      <span
        className={cn(
          'inline-block w-2.5 h-2.5 rounded-full',
          on ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground',
        )}
      />
      {on ? 'Live' : 'Connecting'}
    </div>
  );
}
