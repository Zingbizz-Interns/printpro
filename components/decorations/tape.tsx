export function Tape({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`absolute left-1/2 -top-3 h-6 w-24 -translate-x-1/2 -rotate-6
        bg-pencil/15 backdrop-blur-[1px]
        shadow-[0_1px_0_0_rgba(45,45,45,0.2)]
        pointer-events-none
        ${className}`}
      style={{
        clipPath: 'polygon(5% 0%, 95% 10%, 100% 100%, 0% 90%)',
      }}
    />
  );
}
