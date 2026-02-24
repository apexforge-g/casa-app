interface CompletedStatsProps {
  total: number;
  byUser: Record<string, number>;
  userMap: Record<string, string>;
  label: string;
}

export default function CompletedStats({ total, byUser, userMap, label }: CompletedStatsProps) {
  const parts = Object.entries(byUser)
    .map(([uid, count]) => `${userMap[uid] || "?"}: ${count}`)
    .join(", ");

  return (
    <div className="bg-slate-800/40 rounded-xl px-4 py-3 mb-3">
      <span className="text-sm text-slate-300">
        {label}: <span className="font-semibold text-white">{total} tareas ✅</span>
        {parts && <span className="text-slate-400"> — {parts}</span>}
      </span>
    </div>
  );
}
