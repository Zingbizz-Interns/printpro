'use client';

import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'paper' | 'accent' | 'ink' | 'postit' | 'leaf' | 'muted' | 'amber';

const tones: Record<Tone, string> = {
  paper: 'bg-white text-pencil border-pencil',
  accent: 'bg-accent-lt text-accent border-accent',
  ink: 'bg-ink-lt text-ink border-ink',
  postit: 'bg-postit text-pencil border-pencil',
  leaf: 'bg-leaf-lt text-leaf border-leaf',
  muted: 'bg-muted text-pencil border-pencil/50',
  amber: 'bg-amber-lt text-amber-sketch border-amber-sketch',
};

export function Badge({
  className,
  tone = 'paper',
  dashed,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone; dashed?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-0.5 text-sm font-bold',
        'border-2 whitespace-nowrap wobbly-sm',
        dashed && 'border-dashed',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
