'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Visual size — default `md`. */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'max';
  /** Tilt is deprecated in Minimal Modern but kept in API for compatibility. */
  tilt?: 'l' | 'r' | 'none';
}

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  '2xl': 'max-w-6xl',
  max: 'max-w-[95vw]',
};

/**
 * Modern minimalist modal. Controlled — supply `open` + `onOpenChange`.
 * Radix handles ESC, outside click, focus trap, accessibility.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  tilt = 'none', // ignored
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 transition-opacity" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[110] -translate-x-1/2 -translate-y-1/2',
            'w-[calc(100vw-2rem)]',
            sizes[size],
            'max-h-[calc(100vh-4rem)] overflow-y-auto',
            'bg-card border border-border shadow-2xl rounded-3xl p-8',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'duration-200 focus:outline-none',
          )}
        >
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <Dialog.Title className="font-body font-bold text-2xl text-foreground tracking-tight">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1.5 text-muted-foreground text-sm">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Close"
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <X size={18} strokeWidth={2.5} />
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            {children}
          </div>

          {footer && (
            <div className="mt-8 pt-5 border-t border-border flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
