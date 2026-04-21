'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, Package, TrendingUp, FileText, LogOut, Palette } from 'lucide-react';
import { useAuthStore } from '@/lib/auth/store';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function MorePage() {
  const user = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const isOwner = user?.role === 'owner';

  const items: { href: string; label: string; desc: string; Icon: typeof Users; ownerOnly?: boolean }[] = [
    { href: '/customers', label: 'Customers', desc: 'People we print for', Icon: Users },
    { href: '/products', label: 'Products', desc: 'Categories catalogue', Icon: Package },
    { href: '/dashboard', label: 'Dashboard', desc: 'Shop health', Icon: TrendingUp, ownerOnly: true },
    { href: '/reports', label: 'Reports', desc: 'CSV exports', Icon: FileText, ownerOnly: true },
    { href: '/design', label: 'Design System', desc: 'Components showcase', Icon: Palette },
  ];

  return (
    <main className="px-4 sm:px-6 py-8 space-y-8 max-w-2xl mx-auto">
      {user && (
        <Card className="overflow-visible border border-border shadow-sm rounded-3xl bg-card">
          <CardBody className="flex items-center gap-5 p-6">
            <div
              className="w-16 h-16 rounded-2xl grid place-items-center text-white font-body font-bold text-2xl shadow-inner border border-white/20"
              style={{ background: user.color || '#0052FF' }}
            >
              {initialsOf(user.name)}
            </div>
            <div className="flex-1">
              <div className="font-body font-bold text-2xl leading-tight text-foreground">{user.name}</div>
              <div className="text-sm font-medium text-muted-foreground mt-0.5">@{user.username}</div>
            </div>
            <Badge tone={isOwner ? 'amber' : 'ink'} className="rounded-lg shadow-sm px-3 py-1 text-sm font-semibold">
              {isOwner ? '👑 Admin' : '👤 Staff'}
            </Badge>
          </CardBody>
        </Card>
      )}

      <div>
        <h2 className="text-3xl font-body font-bold tracking-tight text-foreground mb-4">
          Navigate
        </h2>
      </div>

      <div className="grid gap-4">
        {items
          .filter((i) => !i.ownerOnly || isOwner)
          .map(({ href, label, desc, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-5 bg-card border border-border rounded-2xl shadow-sm px-5 py-4 hover:shadow-md hover:border-muted-foreground/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-muted grid place-items-center shrink-0 border border-border group-hover:bg-foreground group-hover:text-white group-hover:border-foreground transition-colors duration-300">
                <Icon size={20} strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <div className="font-body font-bold text-xl leading-tight text-foreground">{label}</div>
                <div className="text-sm font-medium text-muted-foreground mt-0.5">{desc}</div>
              </div>
              <span className="text-muted-foreground opacity-50 group-hover:translate-x-1 group-hover:opacity-100 transition-all font-bold">→</span>
            </Link>
          ))}
      </div>

      <div className="pt-4 mt-8 border-t border-border">
        <Button
          type="button"
          variant="danger"
          className="w-full shadow-sm rounded-2xl py-6 font-bold text-lg"
          onClick={async () => {
            await logout();
            router.replace('/login');
          }}
        >
          <LogOut size={20} strokeWidth={2.5} className="mr-2" /> Sign Out
        </Button>

        <p className="text-center text-xs font-medium text-muted-foreground mt-6 uppercase tracking-widest">
          Print Pro · Agentic Minimalist Build
        </p>
      </div>
    </main>
  );
}
