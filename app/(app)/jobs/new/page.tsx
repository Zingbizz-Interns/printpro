'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { JobForm } from '@/components/job-form/job-form';
import { listJobs } from '@/lib/db/jobs';
import { cloneJob, makeDraftJob } from '@/lib/domain/draft';
import { useAuthStore } from '@/lib/auth/store';
import { Card, CardBody } from '@/components/ui/card';

export default function NewJobPage() {
  const params = useSearchParams();
  const cloneId = params.get('clone');
  const user = useAuthStore((s) => s.currentUser);

  // If cloning, load the source job. Otherwise build a blank draft.
  const jobsQ = useQuery({
    queryKey: ['jobs'],
    queryFn: listJobs,
    enabled: !!cloneId,
  });

  const initial = useMemo(() => {
    if (cloneId && jobsQ.data) {
      const src = jobsQ.data.find((j) => String(j.id) === cloneId);
      if (src) return cloneJob(src, user?.name);
    }
    return makeDraftJob(user?.name);
  }, [cloneId, jobsQ.data, user?.name]);

  if (cloneId && jobsQ.isLoading) {
    return (
      <main className="px-6 py-16">
        <Card className="max-w-xl mx-auto p-8 text-center shadow-md border-border rounded-3xl mt-16">
          <CardBody>
            <span className="font-body font-semibold text-xl text-muted-foreground animate-pulse">
              Cloning job…
            </span>
          </CardBody>
        </Card>
      </main>
    );
  }

  return <JobForm key={String(initial.id)} initial={initial} />;
}
