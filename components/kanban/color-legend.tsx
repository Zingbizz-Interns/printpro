'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ALL_STATUSES, STATUS_THEME } from '@/lib/kanban/status-theme';
import { cn } from '@/lib/utils';

export function ColorLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl transition-all">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronDown
          size={16}
          strokeWidth={2}
          className={cn('transition-transform duration-200', open && 'rotate-180')}
        />
        Status Legend
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 flex flex-wrap gap-x-5 gap-y-3 border-t border-border/50">
          {ALL_STATUSES.map((s) => {
            const t = STATUS_THEME[s];
            return (
              <span key={s} className="flex items-center gap-2 text-sm text-foreground">
                <span
                  aria-hidden
                  className="inline-block w-2.5 h-2.5 rounded-full border border-black/10 shadow-sm"
                  style={{ background: t.accent }}
                />
                <span className="font-semibold">{t.mark}</span>
                <span className="text-muted-foreground">{t.label}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
