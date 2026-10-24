/** Side-by-side diagram: an organiser in the middle vs a contract in the middle. */
function Hub({ variant }: { variant: "organiser" | "contract" }) {
  const n = 6;
  const R = 92;
  const bad = variant === "organiser";
  return (
    <svg viewBox="0 0 260 260" className="h-auto w-full max-w-[280px]" aria-hidden>
      {Array.from({ length: n }).map((_, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = Math.round((130 + R * Math.cos(a)) * 100) / 100;
        const y = Math.round((130 + R * Math.sin(a)) * 100) / 100;
        const fake = bad && (i === 2 || i === 4);
        return (
          <g key={i}>
            <line
              x1={130}
              y1={130}
              x2={x}
              y2={y}
              stroke={bad ? "var(--terracotta)" : "var(--pandan)"}
              strokeWidth="2.5"
              strokeDasharray={bad ? "5 5" : undefined}
              opacity={fake ? 0.35 : 0.9}
            />
            <circle
              cx={x}
              cy={y}
              r={17}
              fill={fake ? "var(--cream)" : bad ? "var(--surface)" : "var(--pandan)"}
              stroke={bad ? "var(--terracotta)" : "var(--pandan)"}
              strokeWidth="2.5"
              strokeDasharray={fake ? "3 3" : undefined}
            />
            <text x={x} y={y + 5} textAnchor="middle" fontSize="13" fontWeight="800" fill={fake ? "var(--terracotta)" : bad ? "var(--ink)" : "#fff"}>
              {fake ? "?" : "₱"}
            </text>
          </g>
        );
      })}
      {bad ? (
        <g>
          <circle cx={130} cy={130} r={34} fill="var(--terracotta)" />
          <circle cx={130} cy={121} r={9} fill="#fff" />
          <path d="M112 148c3-12 33-12 36 0" fill="#fff" />
          <path d="M162 98 l26 -26" stroke="var(--terracotta)" strokeWidth="3" markerEnd="url(#arrow-bad)" />
          <defs>
            <marker id="arrow-bad" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M0 0L10 5L0 10z" fill="var(--terracotta)" />
            </marker>
          </defs>
        </g>
      ) : (
        <g>
          <rect x={98} y={98} width={64} height={64} rx={16} fill="var(--ink)" />
          <rect x={98} y={98} width={64} height={64} rx={16} fill="url(#hub-weave)" opacity="0.35" />
          <defs>
            <pattern id="hub-weave" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="4" height="8" fill="var(--marigold)" />
            </pattern>
          </defs>
          <path d="M118 128v-6a12 12 0 0 1 24 0v6" stroke="var(--marigold)" strokeWidth="4" fill="none" />
          <rect x={113} y={127} width={34} height={22} rx={5} fill="var(--marigold)" />
        </g>
      )}
    </svg>
  );
}

export function WhoHolds() {
  return (
    <section aria-labelledby="who-heading">
      <p className="eyebrow">The one change that matters</p>
      <h2 id="who-heading" className="font-display mt-3 max-w-3xl text-3xl font-semibold sm:text-5xl">
        Who holds the money?
      </h2>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <div className="mat-card relative overflow-hidden p-6">
          <div className="absolute inset-x-0 top-0 h-1.5 ribbon-fail" aria-hidden />
          <p className="eyebrow !text-terracotta">Today</p>
          <p className="font-display mt-1 text-2xl font-semibold">An organiser in the middle</p>
          <div className="my-4 flex justify-center">
            <Hub variant="organiser" />
          </div>
          <ul className="space-y-2 text-ink-soft">
            {[
              "One person holds everyone's cash — and can disappear with it.",
              "Fees and “returns” are whatever they say they are.",
              "Seats can be padded with members who don't exist.",
              "Years of on-time saving leave no record anywhere.",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <span aria-hidden className="mt-0.5 font-black text-terracotta">✕</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="mat-card relative overflow-hidden p-6">
          <div className="absolute inset-x-0 top-0 h-1.5 ribbon-pass" aria-hidden />
          <p className="eyebrow !text-pandan-ink">With Giliran</p>
          <p className="font-display mt-1 text-2xl font-semibold">A contract in the middle</p>
          <div className="my-4 flex justify-center">
            <Hub variant="contract" />
          </div>
          <ul className="space-y-2 text-ink-soft">
            {[
              "No key can move the pot. Not the organiser, not us.",
              "Fee is a hard-coded 0%. Payouts never exceed what came in.",
              "Every seat needs a funded deposit — fakes show up in the checker.",
              "Every on-time payment stamps a Savings Passport.",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <span aria-hidden className="mt-0.5 font-black text-pandan-ink">✓</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
