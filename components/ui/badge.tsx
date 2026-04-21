'use client';

import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

type Tone = 'paper' | 'accent' | 'ink' | 'postit' | 'leaf' | 'muted' | 'amber';

const tones: Record<Tone, string> = {
  paper: 'border-border bg-background text-foreground',
  accent: 'border-accent/30 bg-accent/5 text-accent',
  ink: 'border-foreground/30 bg-foreground/5 text-foreground',
  postit: 'border-blue-200/30 bg-blue-50/50 text-blue-700', // mapped to blue for modern feel
  leaf: 'border-green-200/30 bg-green-50/50 text-green-700',
  muted: 'border-border/50 bg-muted text-muted-foreground',
  amber: 'border-amber-200/30 bg-amber-50/50 text-amber-700',
};

// If standard UI badge needed
export function Badge({
  className,
  tone = 'paper',
  dashed,
  animatedDot = false,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone; dashed?: boolean; animatedDot?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-xs font-medium uppercase tracking-[0.1em]',
        'border',
        tones[tone],
        dashed && 'border-dashed',
        className,
      )}
      {...props}
    >
      {animatedDot && (
        <motion.span
          className="h-1.5 w-1.5 rounded-full bg-current"
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {props.children}
    </span>
  );
}
