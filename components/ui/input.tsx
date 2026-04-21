'use client';

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const fieldBase =
  'w-full bg-card/50 backdrop-blur-sm text-foreground font-body text-base ' +
  'border border-border rounded-xl shadow-sm ' +
  'px-4 py-2.5 ' +
  'placeholder:text-muted-foreground placeholder:opacity-80 ' +
  'focus:border-transparent focus:ring-2 focus:ring-ring focus:outline-none ' +
  'transition-all duration-200 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldBase, className)} {...props} />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(fieldBase, 'resize-y min-h-[100px]', className)}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'font-body font-semibold text-sm text-foreground mb-1.5 inline-block',
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  children,
  hint,
  error,
}: {
  label?: string;
  children: React.ReactNode;
  hint?: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col mb-4">
      {label && <Label>{label}</Label>}
      {children}
      {hint && !error && <span className="text-xs text-muted-foreground mt-1.5">{hint}</span>}
      {error && <span className="text-xs text-red-500 font-medium mt-1.5">{error}</span>}
    </div>
  );
}
