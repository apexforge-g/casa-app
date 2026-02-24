"use client";

import { useState, useEffect } from "react";
import { Category } from "@/types";

interface CreateTaskSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    category_id: string | null;
    assigned_to: string;
    priority: "alta" | "media" | "baja";
    due_date: string | null;
    budget: number | null;
    currency: string;
  }) => void;
  categories: Category[];
  users: { id: string; name: string }[];
}

export default function CreateTaskSheet({
  open,
  onClose,
  onSubmit,
  categories,
  users,
}: CreateTaskSheetProps) {
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [assignedTo, setAssignedTo] = useState("both");
  const [priority, setPriority] = useState<"alta" | "media" | "baja">("media");
  const [dueDate, setDueDate] = useState("");
  const [budget, setBudget] = useState("");

  useEffect(() => {
    if (open) {
      setTitle("");
      setCategoryId(categories[0]?.id || "");
      setAssignedTo("both");
      setPriority("media");
      setDueDate("");
      setBudget("");
    }
  }, [open, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      category_id: categoryId || null,
      assigned_to: assignedTo,
      priority,
      due_date: dueDate || null,
      budget: budget ? Number(budget) : null,
      currency: "CLP",
    });
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 rounded-t-2xl border-t border-slate-800 p-6 pb-8 max-w-lg mx-auto sheet-enter-active">
        {/* Handle */}
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-4" />

        <h2 className="text-lg font-semibold mb-4">Nueva tarea</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="¿Qué hay que hacer?"
            autoFocus
            className="w-full px-4 py-3 bg-slate-800 rounded-xl border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />

          {/* Category + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="px-3 py-2.5 bg-slate-800 rounded-xl border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as "alta" | "media" | "baja")}
              className="px-3 py-2.5 bg-slate-800 rounded-xl border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="alta">🔴 Alta</option>
              <option value="media">🟡 Media</option>
              <option value="baja">🟢 Baja</option>
            </select>
          </div>

          {/* Assign + Due date row */}
          <div className="grid grid-cols-2 gap-3">
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="px-3 py-2.5 bg-slate-800 rounded-xl border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="both">👥 Ambos</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="px-3 py-2.5 bg-slate-800 rounded-xl border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Budget */}
          <div className="flex gap-3 items-center">
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="💰 Presupuesto (opcional)"
              className="flex-1 px-3 py-2.5 bg-slate-800 rounded-xl border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-slate-500"
            />
            <span className="text-sm text-slate-500 font-medium">CLP</span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!title.trim()}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-colors"
          >
            Crear tarea
          </button>
        </form>
      </div>
    </>
  );
}
