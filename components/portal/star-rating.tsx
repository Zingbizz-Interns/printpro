'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  value: number;
  onChange?: (next: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
}

const PX = { sm: 16, md: 22, lg: 32 } as const;
const LABEL: Record<number, string> = {
  1: 'Not great',
  2: 'Could be better',
  3: 'Okay',
  4: 'Good',
  5: 'Excellent',
};

/**
 * Five-star rating widget. Hover preview on desktop, tap-to-set on
 * mobile. In read-only mode it renders the filled stars without any
 * interaction affordance.
 */
export function StarRating({ value, onChange, size = 'md', readOnly = false }: Props) {
  const [hover, setHover] = useState(0);
  const displayed = hover || value;
  const px = PX[size];

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <div
        className="inline-flex items-center gap-1"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n <= displayed;
          const clickable = !readOnly && typeof onChange === 'function';
          return (
            <button
              key={n}
              type="button"
              aria-label={`${n} star${n === 1 ? '' : 's'}`}
              aria-pressed={n === value}
              disabled={!clickable}
              onMouseEnter={() => clickable && setHover(n)}
              onFocus={() => clickable && setHover(n)}
              onBlur={() => clickable && setHover(0)}
              onClick={() => clickable && onChange!(n)}
              className={cn(
                'p-0.5 rounded transition-transform',
                clickable && 'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring',
                !clickable && 'cursor-default',
              )}
            >
              <Star
                size={px}
                className={cn(
                  'transition-colors',
                  active ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40',
                )}
              />
            </button>
          );
        })}
      </div>
      {!readOnly && value > 0 && (
        <div className="text-xs text-muted-foreground">{LABEL[displayed]}</div>
      )}
    </div>
  );
}
