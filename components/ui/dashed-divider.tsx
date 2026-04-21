import { cn } from '@/lib/utils';

export function DashedDivider({
  className,
  vertical,
}: {
  className?: string;
  vertical?: boolean;
}) {
  return (
    <div
      role="separator"
      className={cn(
        vertical
          ? 'w-px border-l border-border self-stretch'
          : 'h-px border-t border-border w-full',
        className,
      )}
    />
  );
}
