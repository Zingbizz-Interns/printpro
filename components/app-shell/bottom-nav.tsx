'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Printer, Plus, Users, MoreHorizontal, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Mobile bottom nav. Reference app pattern: persistent 5-slot bar with
 * a raised central FAB for + Add Job.
 */
export function BottomNav() {
  const pathname = usePathname();
  const items = [
    { href: '/kanban', Icon: Home, label: 'Board' },
    { href: '/customers', Icon: Users, label: 'People' },
    { href: '/jobs/new', Icon: Plus, label: 'Add', primary: true },
    { href: '/products', Icon: Printer, label: 'Products' },
    { href: '/more', Icon: MoreHorizontal, label: 'More' },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border shadow-[0_-4px_24px_rgba(0,0,0,0.05)]">
      <div className="flex items-end justify-around max-w-md mx-auto px-2 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
        {items.map(({ href, Icon, label, primary }) => {
          const active = pathname?.startsWith(href);
          if (primary) {
            return (
              <Link key={href} href={href} className="-mt-6 group">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-accent text-white shadow-accent transition-transform duration-200 hover:-translate-y-1 active:scale-[0.95]">
                  <Icon size={24} strokeWidth={2.5} />
                </div>
              </Link>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 py-1.5 px-3 text-[11px] font-body font-medium transition-colors',
                active ? 'text-accent' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} className={cn('transition-transform', active && '-translate-y-0.5')} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
