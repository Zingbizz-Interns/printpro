'use client';

import Link from 'next/link';
import {
  Printer,
  Users,
  Package,
  TrendingUp,
  Wallet,
  Zap,
  ArrowRight,
  LogIn,
} from 'lucide-react';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StickyNote } from '@/components/ui/sticky-note';
import { Squiggle, Underline } from '@/components/decorations/squiggle';
import { Tape } from '@/components/decorations/tape';
import { useAuthStore } from '@/lib/auth/store';
import { cn } from '@/lib/utils';

export default function Home() {
  const user = useAuthStore((s) => s.currentUser);
  const hydrated = useAuthStore((s) => s.hydrated);
  const isOwner = user?.role === 'owner';

  return (
    <main
      className="min-h-screen"
      style={{
        backgroundImage:
          'radial-gradient(var(--color-muted) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* ── Top strip ────────────────────────────────────────────── */}
      <header className="max-w-[1200px] mx-auto px-6 pt-6 pb-2 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="wobbly-circle w-10 h-10 bg-ink text-white border-2 border-pencil grid place-items-center shadow-hand-sm">
            <Printer size={18} strokeWidth={2.5} />
          </div>
          <span className="font-display text-2xl leading-none">Print Pro</span>
        </Link>
        <div className="flex items-center gap-3">
          {hydrated && user ? (
            <>
              <span className="hidden sm:inline text-sm text-pencil/60 italic">
                signed in as {user.name.split(' ')[0]}
              </span>
              <Link href="/kanban">
                <Button variant="primary" size="sm">
                  open board <ArrowRight size={16} strokeWidth={2.5} />
                </Button>
              </Link>
            </>
          ) : (
            <Link href="/login">
              <Button variant="primary" size="sm">
                <LogIn size={16} strokeWidth={2.5} /> sign in
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="max-w-[1200px] mx-auto px-6 pt-12 pb-20 grid gap-10 md:grid-cols-[1.1fr_1fr] items-center">
        <div>
          <StickyNote tilt="l" className="mb-6">
            ✨ Job orders, without the chaos
          </StickyNote>

          <h1 className="font-display text-6xl md:text-7xl leading-[1.02] tracking-tight">
            Every print job,
            <br />
            on <span className="relative inline-block">
              one board
              <Underline className="absolute -bottom-3 left-0 w-full h-3" />
            </span>.
          </h1>

          <p className="mt-8 text-xl text-pencil/75 max-w-xl leading-relaxed">
            Track business cards, banners, brochures, and wedding invites from the
            moment an order walks in to the moment it walks out. Hand-drawn on
            the outside, real-time Postgres on the inside.
          </p>

          <div className="mt-10 flex flex-wrap gap-4 items-center">
            {hydrated && user ? (
              <>
                <Link href="/kanban">
                  <Button variant="ink" size="lg">
                    go to board <ArrowRight size={18} strokeWidth={2.5} />
                  </Button>
                </Link>
                {isOwner && (
                  <Link href="/dashboard">
                    <Button variant="primary" size="lg">
                      view dashboard
                    </Button>
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ink" size="lg">
                    <LogIn size={18} strokeWidth={2.5} /> sign in
                  </Button>
                </Link>
                <a href="#features">
                  <Button variant="primary" size="lg">
                    see what it does
                  </Button>
                </a>
              </>
            )}
          </div>

          <div className="mt-8 flex items-center gap-2 text-sm text-pencil/55 italic">
            <span className="inline-block w-2 h-2 rounded-full bg-leaf animate-pulse" />
            Multi-user · updates sync live across every open tab
          </div>
        </div>

        {/* Hero visual — a stacked kanban peek */}
        <KanbanPeek />
      </section>

      {/* ── Feature grid ───────────────────────────────────────── */}
      <section id="features" className="max-w-[1200px] mx-auto px-6 pb-16">
        <div className="mb-10 text-center">
          <h2 className="font-display text-4xl inline-block relative">
            What&rsquo;s inside
            <Squiggle className="absolute -bottom-3 left-0 w-full h-3" />
          </h2>
          <p className="mt-4 text-pencil/65 italic">
            Built for a print shop — not for &ldquo;enterprises&rdquo;.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Feature
            Icon={Printer}
            tone="postit"
            title="Kanban board"
            body="Drag jobs through Design → Printing → Finishing → Delivery. Urgent ones pin themselves to the top."
          />
          <Feature
            Icon={Wallet}
            tone="accent"
            title="Partial payments"
            body="Log advances, balance-on-delivery, UPI/cash/NEFT. Balance auto-computes from items + GST + discount."
          />
          <Feature
            Icon={Users}
            tone="ink"
            title="Customers CRM"
            body="Auto-saves customers from every new job. Open a ledger to see every order and what's outstanding."
          />
          <Feature
            Icon={Package}
            tone="postit"
            title="Products catalogue"
            body="Reusable categories that drive faster item entry. Rename once, the change cascades to every job."
          />
          <Feature
            Icon={TrendingUp}
            tone="leaf"
            title="Owner dashboard"
            body="Receivables, throughput, and late jobs — all at a glance. Admins only."
          />
          <Feature
            Icon={Zap}
            tone="accent"
            title="Realtime sync"
            body="When staff mark a job &lsquo;Ready&rsquo; in the back, you see it on your tablet the moment it happens."
          />
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section className="max-w-[1200px] mx-auto px-6 pb-20">
        <div className="mb-10 text-center">
          <StickyNote tone="postit" tilt="r">
            the flow
          </StickyNote>
          <h2 className="mt-4 font-display text-4xl">Four steps. That&rsquo;s it.</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-4 relative">
          <Step
            n="1"
            title="New order"
            body="Type the customer, add line items (cards, banners, anything). Advance gets logged."
          />
          <Step
            n="2"
            title="Design"
            body="Upload a crop, mark design approved. Status flips automatically on the board."
          />
          <Step
            n="3"
            title="Print &amp; finish"
            body="Update print status as it moves through machines. Staff can self-serve."
          />
          <Step
            n="4"
            title="Deliver"
            body="Record the balance payment. Job auto-marks Fully Paid + Delivered."
          />
        </div>
      </section>

      {/* ── Footer CTA ─────────────────────────────────────────── */}
      <section className="max-w-[1200px] mx-auto px-6 pb-20">
        <Card tone="postit" wobbly="blob" decoration="tape" className="overflow-visible">
          <CardBody className="text-center py-12 px-6">
            <h3 className="font-display text-4xl">
              {hydrated && user
                ? `Welcome back, ${user.name.split(' ')[0]}.`
                : 'Ready to ditch the whiteboard?'}
            </h3>
            <p className="mt-3 text-pencil/70 italic text-lg">
              {hydrated && user
                ? 'Your board is waiting.'
                : 'Sign in with your work email to get started.'}
            </p>
            <div className="mt-6 flex justify-center gap-4 flex-wrap">
              {hydrated && user ? (
                <Link href="/kanban">
                  <Button variant="ink" size="lg">
                    open the board <ArrowRight size={18} strokeWidth={2.5} />
                  </Button>
                </Link>
              ) : (
                <Link href="/login">
                  <Button variant="ink" size="lg">
                    <LogIn size={18} strokeWidth={2.5} /> sign in
                  </Button>
                </Link>
              )}
            </div>
          </CardBody>
        </Card>
        <p className="mt-8 text-center text-sm text-pencil/40 italic">
          Print Pro · hand-drawn job order management
        </p>
      </section>
    </main>
  );
}

/* ── Subcomponents ───────────────────────────────────────────── */

function Feature({
  Icon,
  title,
  body,
  tone,
}: {
  Icon: typeof Printer;
  title: string;
  body: string;
  tone: 'postit' | 'accent' | 'ink' | 'leaf';
}) {
  const bg: Record<typeof tone, string> = {
    postit: 'bg-postit-lt',
    accent: 'bg-accent-lt',
    ink: 'bg-ink-lt',
    leaf: 'bg-leaf-lt',
  };
  return (
    <Card hoverLift tone="paper" wobbly="md">
      <CardBody>
        <div
          className={cn(
            'wobbly-circle w-12 h-12 grid place-items-center border-2 border-pencil mb-4 shadow-hand-sm',
            bg[tone],
          )}
        >
          <Icon size={20} strokeWidth={2.5} />
        </div>
        <h3 className="font-display text-2xl leading-tight">{title}</h3>
        <p className="mt-2 text-pencil/70 leading-relaxed">{body}</p>
      </CardBody>
    </Card>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <Card tone="paper" wobbly="alt" tilt={Number(n) % 2 === 0 ? 'r' : 'l'}>
      <CardBody>
        <div className="font-display text-5xl text-accent leading-none">{n}</div>
        <h4 className="mt-3 font-display text-xl">{title}</h4>
        <p className="mt-2 text-sm text-pencil/70 leading-relaxed">{body}</p>
      </CardBody>
    </Card>
  );
}

function KanbanPeek() {
  const columns: { label: string; mark: string; tint: string; count: number; items: string[] }[] = [
    {
      label: 'Designing',
      mark: '✎',
      tint: '#dbe7f7',
      count: 4,
      items: ['#1010 · Lakshmi Jewellers', '#1021 · Sri Venkateswara Travels'],
    },
    {
      label: 'Printing',
      mark: '🖨',
      tint: '#fde68a',
      count: 6,
      items: ['#1018 · Ocean Biryani', '#1015 · Green Leaf Ayurveda'],
    },
    {
      label: 'Ready',
      mark: '📦',
      tint: '#fff9c4',
      count: 3,
      items: ['#1023 · Chennai Silks', '#1007 · MRF Tyres & Co'],
    },
  ];

  return (
    <div className="relative h-[420px] hidden md:block">
      <Tape />
      <div className="absolute inset-0 grid grid-cols-3 gap-3 p-4">
        {columns.map((col, i) => (
          <div
            key={col.label}
            className={cn(
              'relative border-2 border-pencil bg-white/80 wobbly-md shadow-hand-soft p-3',
              i === 0 ? 'tilt-l' : i === 2 ? 'tilt-r' : '',
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-display text-base">
                {col.mark} {col.label}
              </span>
              <Badge tone="paper" className="text-xs border-2">
                {col.count}
              </Badge>
            </div>
            <div className="space-y-2">
              {col.items.map((t) => (
                <div
                  key={t}
                  className="relative bg-white border-2 border-pencil wobbly-sm shadow-hand-sm px-2 py-2 text-xs"
                >
                  <div
                    aria-hidden
                    className="absolute left-0 top-2 bottom-2 w-1 rounded-r"
                    style={{ background: col.tint }}
                  />
                  <div className="pl-2 font-mono font-bold truncate">{t}</div>
                </div>
              ))}
              <div className="text-[10px] italic text-pencil/40 pl-2">
                + {col.count - col.items.length} more
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
