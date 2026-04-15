'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { JobForm } from '@/components/job-form/job-form';
import { listJobs } from '@/lib/db/jobs';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Props {
  params: Promise<{ id: string }>;
}

export default function JobDetail({ params }: Props) {
  const { id } = use(params);
  const numericId = Number(id);

  const jobsQ = useQuery({ queryKey: ['jobs'], queryFn: listJobs });

  if (jobsQ.isLoading) {
    return (
      <main className="px-6 py-16 text-center">
        <span className="font-display text-2xl text-pencil/60 animate-pulse">loading job…</span>
      </main>
    );
  }

  const job = jobsQ.data?.find((j) => j.id === numericId);

  if (!job) {
    return (
      <main className="px-6 py-16">
        <Card tone="accent" wobbly="alt" tilt="l" className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl">Job not found</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-pencil/70">
              Job #{id} doesn't exist, or was just deleted by another user.
            </p>
            <Link href="/kanban">
              <Button variant="primary">← Back to board</Button>
            </Link>
          </CardBody>
        </Card>
      </main>
    );
  }

  return <JobForm key={String(job.id)} initial={job} />;
}
