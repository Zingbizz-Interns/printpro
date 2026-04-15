'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ALL_STATUSES, STATUS_THEME } from '@/lib/kanban/status-theme';
import { cn } from '@/lib/utils';

export function ColorLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white/70 border border-dashed border-pencil/40 wobbly-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-pencil/70 hover:text-pencil"
      >
        <ChevronDown
          size={14}
          strokeWidth={2.5}
          className={cn('transition-transform', open && 'rotate-180')}
        />
        status legend
      </button>
      {open && (
        <div className="px-3 pb-3 flex flex-wrap gap-x-4 gap-y-2">
          {ALL_STATUSES.map((s) => {
            const t = STATUS_THEME[s];
            return (
              <span key={s} className="flex items-center gap-1.5 text-xs">
                <span
                  aria-hidden
                  className="inline-block w-3 h-3 border border-pencil"
                  style={{ background: t.accent, borderRadius: '3px 8px 3px 8px' }}
                />
                <span className="font-bold">{t.mark}</span>
                {t.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
