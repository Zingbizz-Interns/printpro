'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, Package, TrendingUp, FileText, LogOut, Palette } from 'lucide-react';
import { useAuthStore } from '@/lib/auth/store';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Squiggle } from '@/components/decorations/squiggle';

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
    { href: '/customers', label: 'Customers', desc: 'people we print for', Icon: Users },
    { href: '/products', label: 'Products', desc: 'categories catalogue', Icon: Package },
    { href: '/dashboard', label: 'Dashboard', desc: 'shop health', Icon: TrendingUp, ownerOnly: true },
    { href: '/reports', label: 'Reports', desc: 'CSV exports', Icon: FileText, ownerOnly: true },
    { href: '/design', label: 'Design system', desc: 'components showcase', Icon: Palette },
  ];

  return (
    <main className="px-4 sm:px-6 py-6 space-y-6 max-w-2xl mx-auto">
      {user && (
        <Card tone="paper" decoration="tape" tilt="l" wobbly="alt" className="overflow-visible">
          <CardBody className="flex items-center gap-4">
            <div
              className="wobbly-circle w-14 h-14 grid place-items-center text-white font-display text-xl border-2 border-pencil shadow-hand-sm"
              style={{ background: user.color || '#2d5da1' }}
            >
              {initialsOf(user.name)}
            </div>
            <div className="flex-1">
              <div className="font-display text-2xl leading-tight">{user.name}</div>
              <div className="text-sm text-pencil/60">@{user.username}</div>
            </div>
            <Badge tone={isOwner ? 'amber' : 'ink'}>{isOwner ? '👑 Admin' : '👤 Staff'}</Badge>
          </CardBody>
        </Card>
      )}

      <div>
        <h2 className="text-3xl relative inline-block">
          Go to
          <Squiggle className="absolute -bottom-2 left-0 w-full h-3" />
        </h2>
      </div>

      <div className="grid gap-3">
        {items
          .filter((i) => !i.ownerOnly || isOwner)
          .map(({ href, label, desc, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-4 bg-white border-2 border-pencil wobbly-sm shadow-hand-soft px-4 py-3 hover:shadow-hand hover:-translate-y-0.5 transition-all"
            >
              <div className="wobbly-circle w-10 h-10 bg-ink-lt border-2 border-pencil grid place-items-center shrink-0">
                <Icon size={18} strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <div className="font-display text-xl leading-tight">{label}</div>
                <div className="text-sm text-pencil/60">{desc}</div>
              </div>
              <span className="text-pencil/40">→</span>
            </Link>
          ))}
      </div>

      <Button
        type="button"
        variant="danger"
        className="w-full"
        onClick={async () => {
          await logout();
          router.replace('/login');
        }}
      >
        <LogOut size={16} strokeWidth={2.5} /> sign out
      </Button>

      <p className="text-center text-xs text-pencil/40 italic mt-8">
        Print Pro · hand-drawn job order management
      </p>
    </main>
  );
}
