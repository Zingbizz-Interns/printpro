'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/store';
import { listJobs, deleteJob } from '@/lib/db/jobs';
import {
  INITIAL_FILTERS,
  computeStats,
  filterJobs,
  smartSort,
  type KanbanFilters,
} from '@/lib/kanban/filtering';
import { JobCard } from './job-card';
import { KanbanToolbar, type Density } from './kanban-toolbar';
import { KanbanFilters as Filters } from './kanban-filters';
import { ColorLegend } from './color-legend';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function densityGrid(d: Density): string {
  // auto-fit with per-card min width — cards never squeeze below readable
  // and the column count matches the viewport. On mobile the `minmax` falls
  // back to 1 column naturally.
  if (d === 4) return 'grid-cols-[repeat(auto-fill,minmax(300px,1fr))]';
  if (d === 6) return 'grid-cols-[repeat(auto-fill,minmax(230px,1fr))]';
  return 'grid-cols-[repeat(auto-fill,minmax(180px,1fr))]';
}

export function KanbanBoard() {
  const qc = useQueryClient();
  const router = useRouter();
  const isOwner = useAuthStore((s) => s.isOwner());

  const [filters, setFilters] = useState<KanbanFilters>(INITIAL_FILTERS);
  const [density, setDensity] = useState<Density>(6);

  const jobsQ = useQuery({ queryKey: ['jobs'], queryFn: listJobs });
  const jobs = jobsQ.data ?? [];

  const stats = useMemo(() => computeStats(jobs), [jobs]);
  const visible = useMemo(() => smartSort(filterJobs(jobs, filters)), [jobs, filters]);

  const del = useMutation({
    mutationFn: (id: number) => deleteJob(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });

  function patch(p: Partial<KanbanFilters>) {
    setFilters((f) => ({ ...f, ...p }));
  }
  function reset() {
    setFilters({ ...INITIAL_FILTERS, tab: filters.tab });
  }

  function confirmDelete(id: number) {
    const j = jobs.find((x) => x.id === id);
    if (!j) return;
    if (!window.confirm(`Delete Job #${j.jobNo}?\n\nThis removes the order and all its items.`)) return;
    del.mutate(id);
  }

  function confirmClone(id: number) {
    // Phase 4 implements a proper clone modal; for now just route to new with query
    router.push(`/jobs/new?clone=${id}`);
  }

  return (
    <div className="px-4 sm:px-6 py-6 space-y-5">
      <KanbanToolbar
        tab={filters.tab}
        onTab={(t) => patch({ tab: t })}
        stats={stats}
        density={density}
        onDensity={setDensity}
      />

      <Filters
        filters={filters}
        onChange={patch}
        onReset={reset}
        visibleCount={visible.length}
        totalCount={filters.tab === 'current' ? stats.active : stats.completed}
      />

      <ColorLegend />

      {/* Loading */}
      {jobsQ.isLoading && (
        <div className={cn('grid gap-4', densityGrid(density))}>
          {Array.from({ length: density * 2 }).map((_, i) => (
            <div
              key={i}
              className="h-40 bg-white/70 border-2 border-dashed border-pencil/30 wobbly-md animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {jobsQ.isError && (
        <Card tone="accent" wobbly="alt" tilt="l" className="p-6">
          <CardTitle className="text-2xl text-accent">Couldn't load jobs</CardTitle>
          <pre className="mt-2 font-mono text-sm whitespace-pre-wrap text-pencil/80">
            {String((jobsQ.error as Error)?.message ?? jobsQ.error)}
          </pre>
        </Card>
      )}

      {/* Empty (no jobs at all) */}
      {!jobsQ.isLoading && jobs.length === 0 && !jobsQ.isError && (
        <EmptyState
          title="No jobs yet"
          sub="Create your first job to get the board rolling."
          actionLabel="+ New Job"
          onAction={() => router.push('/jobs/new')}
        />
      )}

      {/* Empty (filtered out) */}
      {!jobsQ.isLoading && jobs.length > 0 && visible.length === 0 && (
        <EmptyState
          title="Nothing matches"
          sub={
            filters.tab === 'completed'
              ? 'No completed jobs match your filters.'
              : 'Try clearing the filters above.'
          }
          actionLabel="clear filters"
          onAction={reset}
        />
      )}

      {/* Grid */}
      {visible.length > 0 && (
        <div className={cn('grid gap-4', densityGrid(density))}>
          <AnimatePresence mode="popLayout">
            {visible.map((j) => (
              <JobCard
                key={String(j.id)}
                job={j}
                isOwner={isOwner}
                dense={density >= 8}
                onClone={confirmClone}
                onDelete={confirmDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function EmptyState({
  title,
  sub,
  actionLabel,
  onAction,
}: {
  title: string;
  sub: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <Card tone="postit" decoration="tape" tilt="r" wobbly="alt" className="p-8 text-center max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-3xl">{title}</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-lg text-pencil/70">{sub}</p>
        <div className="flex justify-center">
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
