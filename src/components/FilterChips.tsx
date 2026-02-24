"use client";

interface FilterChipsProps {
  active: string;
  onChange: (filter: string) => void;
}

const filters = [
  { key: "todas", label: "Todas" },
  { key: "mias", label: "Mis tareas" },
  { key: "pendientes", label: "Pendientes" },
];

export default function FilterChips({ active, onChange }: FilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-3">
      {filters.map((f) => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            active === f.key
              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
