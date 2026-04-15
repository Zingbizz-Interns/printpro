'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuthStore } from '@/lib/auth/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    <header
      className="sticky top-0 z-40 bg-paper/90 backdrop-blur border-b-2 border-dashed border-pencil/40"
      style={{ backgroundImage: 'radial-gradient(var(--color-muted) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
    >
      <div className="max-w-[1800px] mx-auto px-6 py-3 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="wobbly-circle w-10 h-10 bg-ink text-white border-2 border-pencil grid place-items-center shadow-hand-sm">
            <Printer size={18} strokeWidth={2.5} />
          </div>
          <span className="font-display text-2xl leading-none hidden sm:block">Print Pro</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-6">
          {nav
            .filter((n) => !n.ownerOnly || isOwner)
            .map(({ href, label, Icon }) => {
              const active = pathname?.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 font-display text-lg wobbly-sm border-2 transition-all',
                    active
                      ? 'nav-link-active shadow-hand-sm'
                      : 'border-transparent hover:border-pencil/50 hover:bg-postit-lt',
                  )}
                >
                  <Icon size={18} strokeWidth={2.5} />
                  {label}
                </Link>
              );
            })}
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <LiveDot status={rtStatus} />
          <div className="hidden sm:flex items-center gap-2">
            <div
              className="wobbly-circle w-9 h-9 grid place-items-center text-white font-display text-sm border-2 border-pencil"
              style={{ background: user.color || '#2d5da1' }}
              title={`${user.name} (${user.role})`}
            >
              {initialsOf(user.name)}
            </div>
            <Badge tone={isOwner ? 'amber' : 'ink'}>{isOwner ? '👑 Admin' : '👤 Staff'}</Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              logout();
              router.replace('/login');
            }}
            title="Sign out"
          >
            <LogOut size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline">sign out</span>
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
        'flex items-center gap-1.5 px-2 py-1 border-2 wobbly-sm text-xs font-bold',
        on ? 'border-leaf bg-leaf-lt text-leaf' : 'border-pencil/40 bg-muted text-pencil/60',
      )}
      title={on ? 'Realtime sync active' : `Realtime: ${status.toLowerCase()}`}
    >
      <span
        className={cn(
          'inline-block w-2 h-2 rounded-full',
          on ? 'bg-leaf animate-pulse' : 'bg-pencil/40',
        )}
      />
      {on ? 'live' : 'connecting'}
    </div>
  );
}
