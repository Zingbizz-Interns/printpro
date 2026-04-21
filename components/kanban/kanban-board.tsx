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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function densityGrid(d: Density): string {
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
    router.push(`/jobs/new?clone=${id}`);
  }

  return (
    <div className="px-4 sm:px-8 py-8 space-y-6">
      <KanbanToolbar
        tab={filters.tab}
        onTab={(t) => patch({ tab: t })}
        stats={stats}
        density={density}
        onDensity={setDensity}
      />

      <div className="h-px w-full bg-border" /> {/* Separator */}

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
        <div className={cn('grid gap-5', densityGrid(density))}>
          {Array.from({ length: density * 2 }).map((_, i) => (
            <div
              key={i}
              className="h-44 bg-muted/50 rounded-2xl border border-border animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {jobsQ.isError && (
        <div className="p-8 bg-red-50 rounded-2xl border border-red-200">
          <h3 className="text-2xl font-body font-semibold text-red-600">Couldn't load jobs</h3>
          <pre className="mt-4 font-mono text-sm whitespace-pre-wrap text-red-600/80">
            {String((jobsQ.error as Error)?.message ?? jobsQ.error)}
          </pre>
        </div>
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
          actionLabel="Clear Filters"
          onAction={reset}
        />
      )}

      {/* Grid */}
      {visible.length > 0 && (
        <div className={cn('grid gap-5', densityGrid(density))}>
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
    <div className="p-12 text-center max-w-lg mx-auto bg-card rounded-3xl border border-border mt-10 shadow-sm">
      <h3 className="text-3xl font-body font-bold text-foreground">{title}</h3>
      <p className="text-lg text-muted-foreground mt-4 mb-8 leading-relaxed">{sub}</p>
      <div className="flex justify-center">
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
