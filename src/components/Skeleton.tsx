"use client";

export function SkeletonLine({ width = "w-full", height = "h-4" }: { width?: string; height?: string }) {
  return <div className={`${width} ${height} animate-pulse bg-slate-800/60 rounded-lg`} />;
}

export function SkeletonCard() {
  return (
    <div className="animate-pulse bg-slate-800/60 rounded-xl p-4 space-y-3">
      <div className="h-4 bg-slate-700/60 rounded w-3/4" />
      <div className="h-3 bg-slate-700/40 rounded w-1/2" />
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
      <div className="h-8 w-48 animate-pulse bg-slate-800/60 rounded-lg" />
      <div className="h-4 w-32 animate-pulse bg-slate-800/40 rounded-lg" />
      <div className="flex gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex-1 h-20 animate-pulse bg-slate-800/60 rounded-xl" />
        ))}
      </div>
      {[1, 2, 3, 4, 5].map(i => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
