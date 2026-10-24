export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  const beads = 8;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className={className}>
      <circle cx="20" cy="20" r="13" fill="none" stroke="var(--sand-deep)" strokeWidth="3" />
      <circle cx="20" cy="20" r="13" fill="none" stroke="var(--marigold)" strokeWidth="3" strokeDasharray="3 3" />
      {Array.from({ length: beads }).map((_, i) => {
        const a = (i / beads) * Math.PI * 2 - Math.PI / 2;
        const x = 20 + Math.cos(a) * 13;
        const y = 20 + Math.sin(a) * 13;
        const crown = i === 0;
        return (
          <circle
            key={i}
            cx={x.toFixed(2)}
            cy={y.toFixed(2)}
            r={crown ? 4 : 2.6}
            fill={crown ? "var(--marigold)" : i % 3 === 1 ? "var(--pandan)" : "var(--ink)"}
            stroke="var(--cream)"
            strokeWidth="1.2"
          />
        );
      })}
      <circle cx="20" cy="20" r="5" fill="var(--terracotta)" />
    </svg>
  );
}
