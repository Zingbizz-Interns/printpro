/**
 * L-shaped corner marks — viewfinder-style decoration around hero images.
 */
export function CornerMarks({ className = '' }: { className?: string }) {
  const Mark = ({ rotate }: { rotate: number }) => (
    <svg
      viewBox="0 0 24 24"
      className="absolute h-6 w-6"
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden
    >
      <path
        d="M2 10 L2 2 L10 2"
        fill="none"
        stroke="#2d2d2d"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 ${className}`}>
      <div className="absolute -left-2 -top-2"><Mark rotate={0} /></div>
      <div className="absolute -right-2 -top-2"><Mark rotate={90} /></div>
      <div className="absolute -right-2 -bottom-2"><Mark rotate={180} /></div>
      <div className="absolute -left-2 -bottom-2"><Mark rotate={270} /></div>
    </div>
  );
}
