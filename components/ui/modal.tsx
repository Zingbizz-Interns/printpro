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
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Tilt the content card for hand-drawn charm. */
  tilt?: 'l' | 'r' | 'none';
}

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

/**
 * Hand-drawn modal. Controlled — supply `open` + `onOpenChange`.
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
  tilt = 'none',
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-pencil/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[110] -translate-x-1/2 -translate-y-1/2',
            'w-[calc(100vw-2rem)]',
            sizes[size],
            'max-h-[calc(100vh-4rem)] overflow-y-auto',
            'bg-white border-2 border-pencil shadow-hand-lg wobbly-md p-6',
            tilt === 'l' && 'tilt-l',
            tilt === 'r' && 'tilt-r',
            'focus:outline-none',
          )}
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <Dialog.Title className="font-display text-3xl leading-tight">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-pencil/70 text-base">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Close"
              className="shrink-0 w-8 h-8 grid place-items-center wobbly-sm border-2 border-pencil hover:bg-accent hover:text-white hover:border-accent transition-colors"
            >
              <X size={16} strokeWidth={2.5} />
            </Dialog.Close>
          </div>

          <div className="space-y-4">{children}</div>

          {footer && (
            <div className="mt-6 pt-4 border-t-2 border-dashed border-pencil/30 flex items-center gap-3">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
