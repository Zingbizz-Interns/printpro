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
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-paper/95 backdrop-blur border-t-2 border-dashed border-pencil/40">
      <div className="flex items-end justify-around max-w-md mx-auto px-2 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
        {items.map(({ href, Icon, label, primary }) => {
          const active = pathname?.startsWith(href);
          if (primary) {
            return (
              <Link key={href} href={href} className="-mt-6">
                <div className="wobbly-circle w-14 h-14 bg-accent text-white border-[3px] border-pencil grid place-items-center shadow-hand active:translate-y-1 active:shadow-hand-sm">
                  <Icon size={24} strokeWidth={3} />
                </div>
              </Link>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1 px-2 text-xs font-display',
                active ? 'text-accent' : 'text-pencil/60',
              )}
            >
              <Icon size={22} strokeWidth={2.5} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
