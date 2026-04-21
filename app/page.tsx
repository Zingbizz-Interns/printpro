'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
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
import { useAuthStore } from '@/lib/auth/store';
import { cn } from '@/lib/utils';

/* Framer Motion Configuration */
const easeOut = [0.16, 1, 0.3, 1] as const;
const fadeInUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeOut } },
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

export default function Home() {
  const user = useAuthStore((s) => s.currentUser);
  const hydrated = useAuthStore((s) => s.hydrated);
  const isOwner = user?.role === 'owner';

  return (
    <main className="min-h-screen bg-background">
      {/* ── Top strip ────────────────────────────────────────────── */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 pb-4 pt-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-accent text-white shadow-accent">
            <Printer size={20} strokeWidth={2.5} />
          </div>
          <span className="font-display text-2xl tracking-tight text-foreground">Print Pro</span>
        </Link>
        <div className="flex items-center gap-4">
          {hydrated && user ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                signed in as {user.name.split(' ')[0]}
              </span>
              <Link href="/kanban">
                <Button variant="primary" size="sm">
                  Dashboard <ArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </>
          ) : (
            <Link href="/login">
              <Button variant="ghost" size="sm" className="font-semibold">
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-28 md:py-32">
        <div className="grid items-center gap-16 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-2xl">
            <motion.div variants={fadeInUp} className="mb-8">
              <Badge tone="accent" animatedDot>
                The Modern Print Shop
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="font-display text-5xl leading-[1.05] tracking-tight text-foreground md:text-[5.25rem]"
            >
              Every print job,
              <br />
              on one{' '}
              <span className="gradient-text relative inline-block">
                board.
                <span className="gradient-underline" aria-hidden="true" />
              </span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl"
            >
              Track business cards, banners, brochures, and wedding invites from the moment an order walks in
              to the moment it walks out. Effortlessly structured, real-time Postgres on the inside.
            </motion.p>

            <motion.div variants={fadeInUp} className="mt-12 flex flex-wrap items-center gap-4">
              {hydrated && user ? (
                <>
                  <Link href="/kanban">
                    <Button variant="primary" size="lg">
                      Go to Board <ArrowRight size={18} className="ml-1 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                  {isOwner && (
                    <Link href="/dashboard">
                      <Button variant="outline" size="lg">
                        View Dashboard
                      </Button>
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="primary" size="lg">
                      Get Started <ArrowRight size={18} className="ml-1 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                  <a href="#features">
                    <Button variant="outline" size="lg">
                      See Features
                    </Button>
                  </a>
                </>
              )}
            </motion.div>

            <motion.div variants={fadeInUp} className="mt-10 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
              </span>
              Live multi-user sync across all devices
            </motion.div>
          </motion.div>

          {/* Hero visual — Animated Graphic */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <AnimatedHeroGraphic />
          </motion.div>
        </div>
      </section>

      {/* ── Feature grid (Inverted Contrast Section) ───────────── */}
      <section id="features" className="relative overflow-hidden bg-foreground py-28 text-background">
        {/* Dot pattern texture wrapper */}
        <div className="bg-dot-pattern absolute inset-0 opacity-[0.03] pointer-events-none" />

        {/* Radial glows */}
        <div className="absolute right-0 top-0 h-[500px] w-[500px] -translate-y-1/3 translate-x-1/3 rounded-full bg-accent/20 blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] translate-y-1/3 -translate-x-1/3 rounded-full bg-accent-secondary/20 blur-[150px] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <Badge tone="paper" dashed className="mb-6 border-background/20 bg-transparent text-background">
              Platform Capabilities
            </Badge>
            <h2 className="font-display text-4xl md:text-5xl">Engineered for Production</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground/80">
              Built specifically for print shops, eliminating the chaos of generic enterprise tools.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Feature
              Icon={Printer}
              title="Kanban Board"
              body="Drag jobs through Design → Printing → Finishing → Delivery. Urgent ones pin themselves to the top."
            />
            <Feature
              Icon={Wallet}
              title="Partial Payments"
              body="Log advances, balance-on-delivery. Balance auto-computes from items + GST + discount."
            />
            <Feature
              Icon={Users}
              title="Customers CRM"
              body="Auto-saves customers from every new job. Open a ledger to see every order and what's outstanding."
            />
            <Feature
              Icon={Package}
              title="Products Catalogue"
              body="Reusable categories that drive faster item entry. Rename once, the change cascades."
            />
            <Feature
              Icon={TrendingUp}
              title="Owner Dashboard"
              body="Receivables, throughput, and late jobs — all at a glance. Admins only."
            />
            <Feature
              Icon={Zap}
              title="Realtime Sync"
              body="When staff mark a job 'Ready' in the back, you see it on your tablet the moment it happens."
            />
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-28">
        <div className="mb-16 flex flex-col items-start gap-8 text-center lg:flex-row lg:items-end lg:justify-between lg:text-left">
          <div>
            <Badge tone="accent" className="mb-6">
              The Workflow
            </Badge>
            <h2 className="font-display text-4xl md:text-5xl">Four Steps to Delivery.</h2>
          </div>
          <p className="max-w-md text-lg text-muted-foreground">
            A streamlined process that takes the cognitive load off your team so they can focus on printing.
          </p>
        </div>

        <div className="relative grid gap-8 md:grid-cols-4">
          {/* Subtle connecting line for desktop */}
          <div className="absolute left-8 right-8 top-[44px] z-0 hidden h-[2px] bg-border md:block" />

          <Step n="1" title="New Order" body="Type the customer, add items. Advance gets logged." />
          <Step n="2" title="Design" body="Upload a crop, mark design approved to move it." />
          <Step n="3" title="Print & Finish" body="Update print status through machines." />
          <Step n="4" title="Deliver" body="Record balance. Job auto-marks Paid + Delivered." />
        </div>
      </section>

      {/* ── Footer CTA ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-28">
        <div className="relative rounded-[2rem] bg-gradient-to-br from-muted/50 to-muted p-[2px]">
          <div className="relative overflow-hidden rounded-[calc(2rem-2px)] bg-background">
            {/* Gradient background hint */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-accent/5 to-transparent" />

            <div className="relative z-10 px-6 py-20 text-center">
              <h3 className="font-display text-4xl md:text-5xl">
                {hydrated && user
                  ? `Welcome back, ${user.name.split(' ')[0]}.`
                  : 'Ready to ditch the whiteboard?'}
              </h3>
              <p className="mx-auto mb-10 mt-6 max-w-xl text-lg text-muted-foreground">
                {hydrated && user
                  ? 'Your board is waiting. Pick up where you left off.'
                  : 'Get an unfair advantage over the competition. Sign in to streamline your operations.'}
              </p>

              <div className="flex content-center justify-center">
                {hydrated && user ? (
                  <Link href="/kanban">
                    <Button variant="primary" size="lg">
                      Open Board <ArrowRight size={18} className="ml-2 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                ) : (
                  <Link href="/login">
                    <Button variant="primary" size="lg">
                      <LogIn size={18} /> Sign In
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-12 text-center text-sm font-medium text-muted-foreground">
          Print Pro &copy; {new Date().getFullYear()} — Structured operations for modern shops
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
}: {
  Icon: typeof Printer;
  title: string;
  body: string;
}) {
  return (
    <Card
      hoverLift
      className="group border-border/20 bg-background/10 backdrop-blur-md"
    >
      <CardBody className="p-8">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-accent text-white shadow-accent transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110">
          <Icon size={24} strokeWidth={2} />
        </div>
        <h3 className="mb-3 font-body text-xl font-semibold text-background">{title}</h3>
        <p className="leading-relaxed text-background/70">{body}</p>
      </CardBody>
    </Card>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="relative z-10">
      <div className="relative z-10 mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-background font-display text-2xl text-accent shadow-sm transition-transform hover:scale-105 hover:shadow-accent/40">
        {n}
      </div>
      <h4 className="mb-3 font-body text-xl font-semibold">{title}</h4>
      <p className="leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function AnimatedHeroGraphic() {
  return (
    <div className="relative flex w-full aspect-square md:aspect-auto items-center justify-center md:h-[600px]">
      {/* Background glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-accent/20 to-transparent opacity-60 blur-[100px]" />

      {/* Slowly rotating dashed ring */}
      <motion.div
        className="pointer-events-none absolute h-[80%] w-[80%] rounded-full border border-dashed border-border"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      />

      {/* Inner rotating solid ring */}
      <motion.div
        className="pointer-events-none absolute h-[50%] w-[50%] rounded-full border border-accent/10"
        animate={{ rotate: -360 }}
        transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
      />

      {/* Floating Cards Container */}
      <div className="relative h-full w-full max-w-sm">
        {/* Card 1 - Designing */}
        <motion.div
          className="absolute -left-[10%] top-[10%] z-10 w-[280px]"
          animate={{ y: [-10, 10, -10] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-xl shadow-accent/5 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold">Designing</span>
              <Badge className="border-transparent bg-blue-50 px-2 py-0 tracking-normal text-blue-700">
                4 Items
              </Badge>
            </div>
            <div className="mb-3 h-2 w-3/4 rounded-full bg-muted" />
            <div className="mb-5 h-2 w-1/2 rounded-full bg-muted" />
            <div className="flex gap-2">
              <div className="h-6 w-6 rounded-full bg-accent/20" />
              <div className="h-6 w-6 rounded-full bg-accent/20" />
            </div>
          </div>
        </motion.div>

        {/* Card 2 - Main focal card */}
        <motion.div
          className="absolute left-[8%] top-[30%] z-20 w-[320px]"
          animate={{ y: [-12, 12, -12] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        >
          <div className="rounded-2xl bg-gradient-to-br from-accent to-accent-secondary p-[2px] shadow-accent-lg">
            <div className="h-full w-full rounded-[calc(1rem-2px)] bg-card p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-accent text-white">
                  <Printer size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Printing Phase</h4>
                  <p className="mt-1 text-xs text-muted-foreground">#1021 • Wedding Invites</p>
                </div>
              </div>
              <div className="mt-6 border-t border-border pt-4">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium text-accent">85%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-[85%] rounded-full bg-gradient-accent" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card 3 - Ready */}
        <motion.div
          className="absolute bottom-[10%] right-[5%] z-10 w-[260px]"
          animate={{ y: [10, -10, 10] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        >
          <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold">Ready</span>
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                  <Package size={14} className="text-emerald-600" />
                </div>
                <div>
                  <div className="mb-1 h-2 w-24 rounded-full bg-muted" />
                  <div className="h-2 w-16 rounded-full bg-muted" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Decorative elements */}
        <div className="absolute right-[10%] top-[20%] grid grid-cols-3 gap-2 opacity-20">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-1.5 w-1.5 rounded-full bg-foreground" />
          ))}
        </div>
      </div>
    </div>
  );
}
