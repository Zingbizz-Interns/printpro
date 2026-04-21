'use client';

import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'postit' | 'ink' | 'accent' | 'leaf';

const tones: Record<Tone, string> = {
  postit: 'bg-muted text-muted-foreground border-l-4 border-l-muted-foreground/30',
  ink: 'bg-blue-50 text-blue-800 border-l-4 border-l-blue-400',
  accent: 'bg-indigo-50 text-indigo-800 border-l-4 border-l-indigo-400',
  leaf: 'bg-emerald-50 text-emerald-800 border-l-4 border-l-emerald-400',
};

/**
 * Replaced StickyNote with a modern informational callout block.
 */
export function StickyNote({
  className,
  tone = 'postit',
  tilt, // deprecated
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: Tone; tilt?: 'l' | 'r' | 'l2' | 'r2' }) {
  return (
    <div
      className={cn(
        'inline-block px-4 py-2 rounded-r-lg font-body text-sm font-medium shadow-sm transition-all',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
