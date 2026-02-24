"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import { Routine, ROUTINE_CATEGORIES, FREQUENCY_OPTIONS } from "@/types";
import Link from "next/link";

function timeAgo(date: string | null): string {
  if (!date) return "Nunca";
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  return `Hace ${days} días`;
}

function getStatusColor(routine: Routine): string {
  if (!routine.last_done_at) return "bg-red-500";
  const elapsed = (Date.now() - new Date(routine.last_done_at).getTime()) / (1000 * 60 * 60 * 24);
  const ratio = elapsed / routine.frequency_days;
  if (ratio < 0.5) return "bg-green-500";
  if (ratio <= 1) return "bg-amber-500";
  return "bg-red-500";
}

function getStatusPercent(routine: Routine): number {
  if (!routine.last_done_at) return 100;
  const elapsed = (Date.now() - new Date(routine.last_done_at).getTime()) / (1000 * 60 * 60 * 24);
  return Math.min(100, Math.round((elapsed / routine.frequency_days) * 100));
}

function frequencyLabel(days: number): string {
  const opt = FREQUENCY_OPTIONS.find(o => o.days === days);
  if (opt) return opt.label;
  return `Cada ${days} días`;
}

export default function RutinasPage() {
  const supabase = useMemo(() => createClient(), []);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const [newName, setNewName] = useState("");
  const [newFreq, setNewFreq] = useState("7");
  const [newCategory, setNewCategory] = useState("Limpieza");

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data } = await supabase.from("routines").select("*").order("created_at");
    const routinesList = data || [];
    setRoutines(routinesList);

    // Auto-create tasks for overdue routines
    await autoCreateTasks(routinesList, user.id);
    setLoading(false);
  }, [supabase]);

  const autoCreateTasks = async (routinesList: Routine[], uid: string) => {
    for (const routine of routinesList) {
      if (!routine.last_done_at) {
        // Never done — check if task already exists
        await ensureTaskForRoutine(routine, uid);
        continue;
      }
      const elapsed = (Date.now() - new Date(routine.last_done_at).getTime()) / (1000 * 60 * 60 * 24);
      if (elapsed > routine.frequency_days) {
        await ensureTaskForRoutine(routine, uid);
      }
    }
  };

  const ensureTaskForRoutine = async (routine: Routine, uid: string) => {
    // Check if an active task already exists for this routine
    const { data: existing } = await supabase
      .from("tasks")
      .select("id")
      .eq("title", `🧹 ${routine.name}`)
      .eq("status", "pending")
      .limit(1);

    if (existing && existing.length > 0) return;

    // Find matching category
    const catName = routine.category === "Limpieza" || routine.category === "Mantención" ? "Mantención" : "Hogar";
    const { data: cats } = await supabase.from("categories").select("id").eq("name", catName).limit(1);

    await supabase.from("tasks").insert({
      title: `🧹 ${routine.name}`,
      category_id: cats?.[0]?.id || null,
      assigned_to: routine.assigned_to || "both",
      priority: "media",
      created_by: uid,
      status: "pending",
    });
  };

  useEffect(() => { loadData(); }, [loadData]);

  const markDone = async (routine: Routine) => {
    const now = new Date().toISOString();
    await supabase.from("routines").update({
      last_done_at: now,
      last_done_by: userId,
    }).eq("id", routine.id);

    // Complete linked task if exists
    const { data: linkedTasks } = await supabase
      .from("tasks")
      .select("id")
      .eq("title", `🧹 ${routine.name}`)
      .eq("status", "pending")
      .limit(1);

    if (linkedTasks && linkedTasks.length > 0) {
      await supabase.from("tasks").update({
        status: "completed",
        completed_by: userId,
        completed_at: now,
      }).eq("id", linkedTasks[0].id);
    }

    setRoutines(prev => prev.map(r =>
      r.id === routine.id ? { ...r, last_done_at: now, last_done_by: userId } : r
    ));
  };

  const addRoutine = async () => {
    if (!newName.trim()) return;
    const { data } = await supabase
      .from("routines")
      .insert({
        name: newName.trim(),
        frequency_days: parseInt(newFreq),
        category: newCategory,
        created_by: userId,
      })
      .select()
      .single();

    if (data) {
      setRoutines(prev => [...prev, data]);
      setNewName("");
      setNewFreq("7");
      setShowAdd(false);
    }
  };

  const deleteRoutine = async (id: string) => {
    await supabase.from("routines").delete().eq("id", id);
    setRoutines(prev => prev.filter(r => r.id !== id));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><div className="text-slate-500 text-lg">Cargando...</div></div>;
  }

  return (
    <div className="max-w-lg mx-auto pb-24">
      <div className="px-4 pt-6 pb-2 flex items-center gap-3">
        <Link href="/tasks/config" className="text-slate-400 text-lg">←</Link>
        <h1 className="text-2xl font-bold">🧹 Rutinas</h1>
      </div>

      <div className="px-4 mb-4">
        <button onClick={() => setShowAdd(!showAdd)} className="text-blue-400 text-sm font-medium">
          {showAdd ? "Cancelar" : "+ Agregar rutina"}
        </button>
      </div>

      {showAdd && (
        <div className="mx-4 bg-slate-800/60 rounded-xl p-4 mb-4 space-y-3">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nombre (ej: Limpiar baño)"
            className="w-full px-3 py-2 bg-slate-700 rounded-lg border border-slate-600 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          <div className="flex gap-2">
            <select
              value={newFreq}
              onChange={e => setNewFreq(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-700 rounded-lg border border-slate-600 text-white text-sm"
            >
              {FREQUENCY_OPTIONS.map(o => (
                <option key={o.days} value={o.days}>{o.label}</option>
              ))}
              <option value="custom">Personalizado</option>
            </select>
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-700 rounded-lg border border-slate-600 text-white text-sm"
            >
              {ROUTINE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={addRoutine} className="w-full py-2 bg-blue-500 text-white text-sm font-medium rounded-lg">
            Agregar
          </button>
        </div>
      )}

      <div className="px-4 space-y-2">
        {routines.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p className="text-4xl mb-3">🧹</p>
            <p>No hay rutinas registradas</p>
          </div>
        )}
        {routines.map(routine => {
          const pct = getStatusPercent(routine);
          const color = getStatusColor(routine);
          return (
            <div key={routine.id} className="bg-slate-800/60 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => markDone(routine)}
                  className="w-10 h-10 rounded-full bg-slate-700 hover:bg-green-500/20 flex items-center justify-center text-lg transition-all active:scale-90"
                  title="Marcar como hecho"
                >
                  ✓
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{routine.name}</span>
                    <button onClick={() => deleteRoutine(routine.id)} className="text-slate-600 hover:text-red-400 text-xs p-1">✕</button>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">{frequencyLabel(routine.frequency_days)}</span>
                    <span className="text-xs text-slate-600">•</span>
                    <span className="text-xs text-slate-500">{timeAgo(routine.last_done_at)}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
