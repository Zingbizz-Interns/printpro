'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'ink';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  wobbly?: 'md' | 'sm' | 'alt';
}

const base =
  'inline-flex items-center justify-center gap-2 font-body font-bold ' +
  'border-[3px] border-pencil select-none whitespace-nowrap ' +
  'transition-all duration-100 ease-out ' +
  'disabled:opacity-50 disabled:pointer-events-none ' +
  'active:translate-x-[4px] active:translate-y-[4px] active:shadow-none';

const sizes: Record<Size, string> = {
  sm: 'px-4 py-2 text-base min-h-[40px]',
  md: 'px-6 py-2.5 text-lg min-h-[48px]',
  lg: 'px-8 py-3 text-xl min-h-[56px]',
};

const variants: Record<Variant, string> = {
  primary:
    'bg-white text-pencil shadow-hand ' +
    'hover:bg-accent hover:text-white hover:shadow-hand-sm hover:translate-x-[2px] hover:translate-y-[2px]',
  secondary:
    'bg-muted text-pencil shadow-hand ' +
    'hover:bg-ink hover:text-white hover:shadow-hand-sm hover:translate-x-[2px] hover:translate-y-[2px]',
  ink:
    'bg-ink text-white shadow-hand ' +
    'hover:bg-pencil hover:shadow-hand-sm hover:translate-x-[2px] hover:translate-y-[2px]',
  danger:
    'bg-accent text-white shadow-hand ' +
    'hover:bg-pencil hover:shadow-hand-sm hover:translate-x-[2px] hover:translate-y-[2px]',
  ghost:
    'bg-transparent text-pencil border-dashed shadow-none ' +
    'hover:bg-postit hover:border-solid hover:shadow-hand-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', wobbly = 'md', ...props }, ref) => {
    const wobblyClass = wobbly === 'sm' ? 'wobbly-sm' : wobbly === 'alt' ? 'wobbly-alt' : 'wobbly-md';
    return (
      <button
        ref={ref}
        className={cn(base, sizes[size], variants[variant], wobblyClass, className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
