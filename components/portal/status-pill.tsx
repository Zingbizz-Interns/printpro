import { statusTheme } from '@/lib/kanban/status-theme';
import { cn } from '@/lib/utils';
import type { JobStatus } from '@/types/db';

/**
 * Read-only status pill for portal views. Uses the same palette as the
 * staff kanban so statuses look identical across both apps.
 */
export function StatusPill({
  status,
  size = 'md',
  className,
}: {
  status: JobStatus | string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const theme = statusTheme(status);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-body font-semibold',
        size === 'sm'
          ? 'px-2.5 py-0.5 text-[11px]'
          : 'px-3 py-1 text-xs',
        className,
      )}
      style={{ background: theme.tint, color: theme.ink }}
    >
      <span aria-hidden>{theme.mark}</span>
      {theme.label}
    </span>
  );
}
