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
      <main className="px-6 py-24 text-center">
        <span className="font-body font-semibold text-2xl text-muted-foreground animate-pulse">Loading job…</span>
      </main>
    );
  }

  const job = jobsQ.data?.find((j) => j.id === numericId);

  if (!job) {
    return (
      <main className="px-6 py-16">
        <Card className="max-w-xl mx-auto p-4 shadow-lg border-red-200 bg-red-50 rounded-3xl mt-16">
          <CardHeader>
            <CardTitle className="text-3xl font-body font-bold text-red-600">Job Not Found</CardTitle>
          </CardHeader>
          <CardBody className="space-y-6">
            <p className="text-red-600/80 font-medium text-lg">
              Job #{id} doesn't exist, or was just deleted by another user.
            </p>
            <Link href="/kanban" className="block text-center mt-6">
              <Button variant="primary" className="shadow-md">← Back to Board</Button>
            </Link>
          </CardBody>
        </Card>
      </main>
    );
  }

  return <JobForm key={String(job.id)} initial={job} />;
}
