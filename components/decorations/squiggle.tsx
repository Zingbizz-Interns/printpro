export function Squiggle({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 20"
      className={`pointer-events-none ${className}`}
    >
      <path
        d="M2 10 Q 20 0, 40 10 T 80 10 T 120 10 T 160 10 T 198 10"
        fill="none"
        stroke="#2d2d2d"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Underline({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 10"
      className={`pointer-events-none ${className}`}
    >
      <path
        d="M2 6 Q 30 1, 60 5 T 118 5"
        fill="none"
        stroke="#ff4d4d"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
