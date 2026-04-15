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
          ? 'w-0 border-l-2 border-dashed border-pencil/40 self-stretch'
          : 'h-0 border-t-2 border-dashed border-pencil/40 w-full',
        className,
      )}
    />
  );
}
