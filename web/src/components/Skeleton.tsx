export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function RingSkeleton() {
  return (
    <div className="mx-auto aspect-square w-full max-w-[520px] p-6" role="status" aria-label="Loading circle">
      <div className="skeleton h-full w-full !rounded-full" />
    </div>
  );
}

export function ErrorState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="mat-card border-l-4 !border-l-terracotta p-6" role="alert">
      <p className="font-display text-xl font-semibold">{title}</p>
      {body && <p className="mt-2 text-ink-soft">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
