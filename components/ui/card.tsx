'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Decoration = 'none' | 'tape' | 'tack'; // Kept for type compat
type Tone = 'paper' | 'postit' | 'muted' | 'ink' | 'accent';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  decoration?: Decoration;
  tone?: Tone;
  wobbly?: any; // Ignored in modern
  tilt?: any; // Ignored in modern
  hoverLift?: boolean;
  elevated?: boolean;
}

const tones: Record<Tone, string> = {
  paper: 'bg-card',
  postit: 'bg-muted',
  muted: 'bg-muted/60',
  ink: 'bg-foreground text-background border-none', // inverted section
  accent: 'bg-accent/5',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      children,
      decoration = 'none',
      tone = 'paper',
      wobbly,
      tilt,
      hoverLift = false,
      elevated = false,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative rounded-2xl border border-border bg-card',
          'transition-all duration-300 ease-out',
          tones[tone],
          elevated ? 'shadow-lg' : 'shadow-md',
          hoverLift && 'hover:-translate-y-1 hover:shadow-xl',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Card.displayName = 'Card';

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-8 pt-8 pb-3', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('font-body font-semibold text-xl tracking-tight', className)} {...props} />;
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-8 py-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-8 pt-3 pb-8 flex items-center gap-3', className)}
      {...props}
    />
  );
}
