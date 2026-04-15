'use client';

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const fieldBase =
  'w-full bg-white text-pencil font-body text-lg ' +
  'border-2 border-pencil ' +
  'px-4 py-2.5 ' +
  'placeholder:text-pencil/40 placeholder:italic ' +
  'focus:border-ink focus:ring-2 focus:ring-ink/20 ' +
  'transition-all duration-100 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldBase, 'wobbly-sm', className)} {...props} />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(fieldBase, 'wobbly-md resize-y min-h-[96px]', className)}
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
        'font-display text-base text-pencil mb-1 inline-block',
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
    <div className="flex flex-col gap-1">
      {label && <Label>{label}</Label>}
      {children}
      {hint && !error && <span className="text-sm text-pencil/60 italic">{hint}</span>}
      {error && <span className="text-sm text-accent font-bold">✗ {error}</span>}
    </div>
  );
}
