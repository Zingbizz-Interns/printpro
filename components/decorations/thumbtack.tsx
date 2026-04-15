export function Thumbtack({ tone = 'accent' }: { tone?: 'accent' | 'ink' | 'amber' | 'leaf' }) {
  const fill =
    tone === 'ink'
      ? '#2d5da1'
      : tone === 'amber'
      ? '#d97706'
      : tone === 'leaf'
      ? '#4a7c59'
      : '#ff4d4d';
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="absolute left-1/2 -top-4 h-8 w-8 -translate-x-1/2 pointer-events-none"
    >
      <ellipse cx="12" cy="12" rx="8" ry="8" fill={fill} />
      <ellipse cx="10" cy="10" rx="2.5" ry="1.8" fill="white" opacity="0.55" />
      <circle cx="12" cy="12" r="8" fill="none" stroke="#2d2d2d" strokeWidth="1.8" />
    </svg>
  );
}
