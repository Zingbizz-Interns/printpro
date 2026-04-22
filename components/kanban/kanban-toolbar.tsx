'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fmt } from '@/lib/domain/totals';
import type { BoardStats, ViewTab } from '@/lib/kanban/filtering';
import { LayoutGrid } from 'lucide-react';

export type Density = 4 | 6 | 8;

interface Props {
  tab: ViewTab;
  onTab: (t: ViewTab) => void;
  stats: BoardStats;
  density: Density;
  onDensity: (d: Density) => void;
}

export function KanbanToolbar({ tab, onTab, stats, density, onDensity }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Current / Completed tabs */}
      <div className="inline-flex items-center border border-border rounded-lg shadow-sm bg-muted/30 overflow-hidden p-1">
        <TabBtn active={tab === 'current'} onClick={() => onTab('current')}>
          Current <span className="opacity-70 font-mono text-xs ml-1.5 px-1.5 py-0.5 rounded-md bg-background/50 border border-border/50">{stats.active}</span>
        </TabBtn>
        <TabBtn active={tab === 'completed'} onClick={() => onTab('completed')}>
          Completed <span className="opacity-70 font-mono text-xs ml-1.5 px-1.5 py-0.5 rounded-md bg-background/50 border border-border/50">{stats.completed}</span>
        </TabBtn>
      </div>

      {/* Stats chips */}
      <div className="flex flex-wrap gap-2">
        {stats.pendingReview > 0 && (
          <Badge tone="ink" className="text-[10px] bg-sky-50 text-sky-700 border-sky-200">
            ⏳ Pending <span className="ml-1">{stats.pendingReview}</span>
          </Badge>
        )}
        <Badge tone="accent" dashed={stats.overdue === 0} className="text-[10px]">
          ⚠ Overdue <span className="ml-1">{stats.overdue}</span>
        </Badge>
        <Badge tone="amber" dashed={stats.dueToday === 0} className="text-[10px]">
          📅 Today <span className="ml-1">{stats.dueToday}</span>
        </Badge>
        <Badge tone="ink" dashed={stats.gst === 0} className="text-[10px]">
          🧾 GST <span className="ml-1">{stats.gst}</span>
        </Badge>
        <Badge tone="postit" dashed={stats.unpaid === 0} className="text-[10px]">
          ● Unpaid <span className="ml-1">{stats.unpaid}</span>
        </Badge>
        <Badge tone="muted" className="text-[10px]">
          Outstanding <span className="ml-1">{fmt(stats.outstanding)}</span>
        </Badge>
      </div>

      <div className="flex-1" />

      {/* Density toggle */}
      <div className="hidden md:inline-flex items-center gap-1 border border-border rounded-lg shadow-sm bg-card p-1">
        <LayoutGrid size={14} strokeWidth={2} className="mx-2 text-muted-foreground" />
        {[4, 6, 8].map((d) => (
          <button
            key={d}
            onClick={() => onDensity(d as Density)}
            className={cn(
              'w-8 h-8 text-xs font-mono font-bold rounded-md transition-all',
              density === d ? 'kb-density-active shadow-sm' : 'kb-density-idle',
            )}
          >
            {d}
          </button>
        ))}
      </div>

      {/* New Job */}
      <Link href="/jobs/new">
        <Button variant="primary" size="sm">+ New Job</Button>
      </Link>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn('kb-tab rounded-md flex items-center', active ? 'kb-tab-active shadow-sm' : 'kb-tab-idle')}
    >
      {children}
    </button>
  );
}
