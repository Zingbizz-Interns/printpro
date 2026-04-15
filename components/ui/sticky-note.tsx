'use client';

import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'postit' | 'ink' | 'accent' | 'leaf';

const tones: Record<Tone, string> = {
  postit: 'bg-postit',
  ink: 'bg-ink-lt',
  accent: 'bg-accent-lt',
  leaf: 'bg-leaf-lt',
};

/**
 * Small sticky-note tag — for section labels, feature callouts.
 * Always slightly tilted, hand-drawn shadow.
 */
export function StickyNote({
  className,
  tone = 'postit',
  tilt = 'l',
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: Tone; tilt?: 'l' | 'r' | 'l2' | 'r2' }) {
  return (
    <div
      className={cn(
        'inline-block px-3 py-1 border-2 border-pencil font-display text-base',
        'shadow-hand-sm wobbly-sm',
        `tilt-${tilt}`,
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
