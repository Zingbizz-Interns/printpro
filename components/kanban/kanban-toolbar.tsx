'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
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
    <div className="flex flex-wrap items-center gap-3">
      {/* Current / Completed tabs */}
      <div className="inline-flex items-center border-2 border-pencil wobbly-md shadow-hand-soft bg-white overflow-hidden">
        <TabBtn active={tab === 'current'} onClick={() => onTab('current')}>
          current <span className="opacity-60 font-mono ml-1">{stats.active}</span>
        </TabBtn>
        <div className="w-px self-stretch bg-pencil" />
        <TabBtn active={tab === 'completed'} onClick={() => onTab('completed')}>
          completed <span className="opacity-60 font-mono ml-1">{stats.completed}</span>
        </TabBtn>
      </div>

      {/* Stats chips */}
      <div className="flex flex-wrap gap-2">
        <Badge tone="accent" dashed={stats.overdue === 0} className="text-xs">
          ⚠ overdue <span className="font-mono ml-1">{stats.overdue}</span>
        </Badge>
        <Badge tone="amber" dashed={stats.dueToday === 0} className="text-xs">
          📅 today <span className="font-mono ml-1">{stats.dueToday}</span>
        </Badge>
        <Badge tone="ink" dashed={stats.gst === 0} className="text-xs">
          🧾 GST <span className="font-mono ml-1">{stats.gst}</span>
        </Badge>
        <Badge tone="postit" dashed={stats.unpaid === 0} className="text-xs">
          ● unpaid <span className="font-mono ml-1">{stats.unpaid}</span>
        </Badge>
        <Badge tone="muted" className="text-xs">
          outstanding <span className="font-mono ml-1">{fmt(stats.outstanding)}</span>
        </Badge>
      </div>

      <div className="flex-1" />

      {/* Density toggle */}
      <div className="hidden md:inline-flex items-center gap-0.5 border-2 border-pencil wobbly-sm bg-white px-1 py-1">
        <LayoutGrid size={14} strokeWidth={2.5} className="mx-1 text-pencil/60" />
        {[4, 6, 8].map((d) => (
          <button
            key={d}
            onClick={() => onDensity(d as Density)}
            className={cn(
              'w-7 h-7 text-xs font-mono font-bold rounded transition-colors',
              density === d ? 'kb-density-active' : 'kb-density-idle',
            )}
          >
            {d}
          </button>
        ))}
      </div>
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
      className={cn('kb-tab', active ? 'kb-tab-active' : 'kb-tab-idle')}
    >
      {children}
    </button>
  );
}
