'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'ink' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  'group inline-flex items-center justify-center gap-2 font-body font-medium ' +
  'whitespace-nowrap rounded-xl transition-all duration-200 ease-out ' +
  'disabled:opacity-50 disabled:pointer-events-none ' +
  'active:scale-[0.98] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const sizes: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm h-10',
  md: 'px-6 py-2 text-base h-12',
  lg: 'px-8 py-3 text-lg h-14',
};

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-accent to-accent-secondary text-white shadow-sm ' +
    'hover:-translate-y-0.5 hover:shadow-accent hover:brightness-110',
  secondary:
    'bg-muted text-foreground shadow-sm hover:-translate-y-0.5 hover:bg-muted/80',
  outline:
    'border border-border bg-transparent hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-sm hover:text-foreground',
  ghost:
    'bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50',
  // Backward compatibility for old usages
  ink: 'bg-foreground text-background shadow-sm hover:-translate-y-0.5 hover:brightness-110',
  danger: 'bg-red-500 text-white shadow-sm hover:-translate-y-0.5 hover:bg-red-600',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(base, sizes[size], variants[variant], className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
