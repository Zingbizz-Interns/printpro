export function Arrow({
  className = '',
  flip = false,
}: {
  className?: string;
  flip?: boolean;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 160 80"
      className={`pointer-events-none ${flip ? 'scale-x-[-1]' : ''} ${className}`}
    >
      <path
        d="M4 40 C 40 10, 90 70, 140 30"
        fill="none"
        stroke="#2d2d2d"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="6 6"
      />
      <path
        d="M132 22 L 144 30 L 132 40"
        fill="none"
        stroke="#2d2d2d"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
