import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Deterministic tilt picker. Same `seed` always returns the same rotation.
 * Avoids jitter on re-render and keeps the "hand-placed" feel.
 */
export function seededTilt(seed: string | number): 'tilt-l' | 'tilt-r' | 'tilt-l2' | 'tilt-r2' | '' {
  const s = typeof seed === 'number' ? seed : [...seed].reduce((a, c) => a + c.charCodeAt(0), 0);
  const bucket = s % 7;
  switch (bucket) {
    case 0: return 'tilt-l';
    case 1: return 'tilt-r';
    case 2: return 'tilt-l2';
    case 3: return 'tilt-r2';
    default: return '';
  }
}

/**
 * Pick one of a few wobbly-border presets based on a seed so cards
 * in a list each get a subtly different shape.
 */
export function seededWobbly(seed: string | number): 'wobbly-md' | 'wobbly-alt' | 'wobbly-sm' {
  const s = typeof seed === 'number' ? seed : [...seed].reduce((a, c) => a + c.charCodeAt(0), 0);
  const bucket = s % 3;
  return (['wobbly-md', 'wobbly-alt', 'wobbly-sm'] as const)[bucket];
}
