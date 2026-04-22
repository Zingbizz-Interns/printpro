'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Package, ArrowRight, FilePlus, Images } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { OrderCard } from '@/components/portal/order-card';
import { useCustomerAuthStore } from '@/lib/auth/customer-store';
import { listMyJobs } from '@/lib/db/portal-orders';
import { fmt, getTotalPaid, jobGrandTotal } from '@/lib/domain/totals';

export default function PortalHome() {
  const user = useCustomerAuthStore((s) => s.currentUser);

  const jobsQ = useQuery({
    queryKey: ['portal-jobs', user?.id],
    queryFn: () => listMyJobs(user!.id),
    enabled: Boolean(user?.id),
  });

  const jobs = jobsQ.data ?? [];
  const active = jobs.filter((j) => j.jobStatus !== 'Delivered');
  const outstanding = jobs.reduce((sum, j) => {
    const bal = jobGrandTotal(j) - getTotalPaid(j);
    return sum + Math.max(bal, 0);
  }, 0);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-tight">
            Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.
          </h1>
          <p className="mt-2 text-muted-foreground">
            Here&apos;s everything in progress. Jobs update in real time as we work on them.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/portal/quote">
            <Button variant="primary" size="sm">
              <FilePlus size={14} /> New quote
            </Button>
          </Link>
          <Link href="/portal/artwork">
            <Button variant="outline" size="sm">
              <Images size={14} /> Artwork
            </Button>
          </Link>
        </div>
      </div>

      {jobsQ.isLoading && (
        <div className="py-16 text-center text-muted-foreground animate-pulse">Loading orders…</div>
      )}

      {jobsQ.isError && (
        <Card tone="accent" className="border-red-200 bg-red-50">
          <CardBody>
            <p className="text-red-600 font-medium">
              Couldn&apos;t load your orders. Refresh the page, or{' '}
              <Link href="/portal/account" className="underline">
                check your account
              </Link>
              .
            </p>
          </CardBody>
        </Card>
      )}

      {jobsQ.isSuccess && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile label="Active orders" value={active.length.toString()} />
            <StatTile label="Total orders" value={jobs.length.toString()} />
            <StatTile
              label="Outstanding"
              value={outstanding > 0 ? fmt(outstanding) : '₹0.00'}
              highlight={outstanding > 0}
            />
          </div>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-body font-semibold text-xl tracking-tight">In progress</h2>
              <Link
                href="/portal/orders"
                className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                View all <ArrowRight size={14} />
              </Link>
            </div>

            {active.length === 0 ? (
              <Card tone="muted" className="border-dashed">
                <CardBody className="py-16 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-background mb-4">
                    <Package size={22} className="text-muted-foreground" />
                  </div>
                  <p className="font-body font-semibold text-lg">No active orders</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    When we receive a new order for you, it&apos;ll show up here.
                  </p>
                  {jobs.length > 0 && (
                    <div className="mt-6">
                      <Link href="/portal/orders">
                        <Button variant="outline" size="sm">
                          See past orders
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardBody>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {active.map((j) => (
                  <OrderCard key={j.id} job={j} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card className="border-border">
      <CardBody className="p-6">
        <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
        <div
          className={
            'mt-2 font-display text-3xl tracking-tight ' +
            (highlight ? 'text-amber-700' : '')
          }
        >
          {value}
        </div>
      </CardBody>
    </Card>
  );
}
