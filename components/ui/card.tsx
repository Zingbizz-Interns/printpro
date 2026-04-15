'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Tape } from '@/components/decorations/tape';
import { Thumbtack } from '@/components/decorations/thumbtack';

type Decoration = 'none' | 'tape' | 'tack';
type Tone = 'paper' | 'postit' | 'muted' | 'ink' | 'accent';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  decoration?: Decoration;
  tone?: Tone;
  wobbly?: 'md' | 'alt' | 'sm' | 'blob' | 'none';
  tilt?: 'none' | 'l' | 'r' | 'l2' | 'r2';
  hoverLift?: boolean;
}

const tones: Record<Tone, string> = {
  paper: 'bg-white',
  postit: 'bg-postit',
  muted: 'bg-muted/60',
  ink: 'bg-ink-lt',
  accent: 'bg-accent-lt',
};

const tilts = {
  none: '',
  l: 'tilt-l',
  r: 'tilt-r',
  l2: 'tilt-l2',
  r2: 'tilt-r2',
};

const wobblies = {
  md: 'wobbly-md',
  alt: 'wobbly-alt',
  sm: 'wobbly-sm',
  blob: 'wobbly-blob',
  none: '',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      children,
      decoration = 'none',
      tone = 'paper',
      wobbly = 'md',
      tilt = 'none',
      hoverLift = false,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative border-2 border-pencil shadow-hand-soft',
          'transition-transform duration-150 ease-out',
          tones[tone],
          wobblies[wobbly],
          tilts[tilt],
          hoverLift && 'hover:-translate-y-1 hover:shadow-hand',
          className,
        )}
        {...props}
      >
        {decoration === 'tape' && <Tape />}
        {decoration === 'tack' && <Thumbtack />}
        {children}
      </div>
    );
  },
);
Card.displayName = 'Card';

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 pt-6 pb-2', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('font-display text-2xl', className)} {...props} />;
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-4', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-6 pt-2 pb-6 flex items-center gap-3', className)}
      {...props}
    />
  );
}
