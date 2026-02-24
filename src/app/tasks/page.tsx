"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";

interface Task {
  id: string;
  title: string;
  assigned_to: "jorge" | "nancy";
  status: "pending" | "done";
  created_by: string;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string;
}

const PEOPLE = [
  { value: "jorge", label: "Jorge", email: "jorge@casa-app.local" },
  { value: "nancy", label: "Nancy", email: "nancy@casa-app.local" },
];

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "justo ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

function nameFromEmail(email: string | null): string {
  if (!email) return "?";
  const p = PEOPLE.find((p) => p.email === email);
  return p ? p.label : email;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [assignTo, setAssignTo] = useState("jorge");
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  const supabase = createClient();

  const fetchTasks = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (err) {
      setError(err.message);
    } else {
      setTasks(data ?? []);
      setError(null);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user?.email ?? null);
    });
    fetchTasks();
  }, []);

  const pending = tasks.filter((t) => t.status === "pending");
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const completed = tasks.filter(
    (t) => t.status === "done" && t.completed_at && t.completed_at >= sevenDaysAgo
  );

  // Stats: done this week (Mon-Sun)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - mondayOffset);
  const mondayISO = monday.toISOString();

  const jorgeCount = tasks.filter(
    (t) =>
      t.status === "done" &&
      t.completed_at &&
      t.completed_at >= mondayISO &&
      t.completed_by === "jorge@casa-app.local"
  ).length;
  const nancyCount = tasks.filter(
    (t) =>
      t.status === "done" &&
      t.completed_at &&
      t.completed_at >= mondayISO &&
      t.completed_by === "nancy@casa-app.local"
  ).length;

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !currentUser) return;
    setSubmitting(true);
    setError(null);
    const { error: err } = await supabase.from("tasks").insert({
      title: title.trim(),
      assigned_to: assignTo,
      created_by: currentUser,
    });
    if (err) {
      setError(err.message);
    } else {
      setTitle("");
    }
    await fetchTasks();
    setSubmitting(false);
  }

  async function markDone(taskId: string) {
    if (!currentUser) return;
    setError(null);
    const { error: err } = await supabase
      .from("tasks")
      .update({
        status: "done",
        completed_by: currentUser,
        completed_at: new Date().toISOString(),
      })
      .eq("id", taskId);
    if (err) setError(err.message);
    await fetchTasks();
  }

  async function deleteTask(taskId: string) {
    setError(null);
    const { error: err } = await supabase.from("tasks").delete().eq("id", taskId);
    if (err) setError(err.message);
    await fetchTasks();
  }

  return (
    <main className="min-h-screen px-4 py-12 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          🏠 Casa App
        </h1>
        <Link
          href="/"
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          Inicio
        </Link>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-6 text-sm">
        <div className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <span className="text-blue-400 font-medium">Jorge:</span>{" "}
          <span className="text-white font-bold">{jorgeCount}</span>{" "}
          <span className="text-slate-400">esta semana</span>
        </div>
        <div className="px-4 py-2 rounded-xl bg-pink-500/10 border border-pink-500/20">
          <span className="text-pink-400 font-medium">Nancy:</span>{" "}
          <span className="text-white font-bold">{nancyCount}</span>{" "}
          <span className="text-slate-400">esta semana</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Add Task Form */}
      <form onSubmit={addTask} className="flex gap-2 mb-8">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nueva tarea..."
          className="flex-1 px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <select
          value={assignTo}
          onChange={(e) => setAssignTo(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white focus:outline-none focus:border-blue-500 transition-colors"
        >
          {PEOPLE.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "..." : "Agregar"}
        </button>
      </form>

      {loading ? (
        <p className="text-slate-400 text-center py-8">Cargando...</p>
      ) : (
        <>
          {/* Pending Tasks */}
          <h2 className="text-lg font-semibold text-white mb-3">
            Pendientes ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <p className="text-slate-500 text-sm mb-8">¡Todo al día! 🎉</p>
          ) : (
            <div className="space-y-2 mb-8">
              {pending.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700/50"
                >
                  <div>
                    <p className="text-white font-medium">{task.title}</p>
                    <p className="text-sm text-slate-400">
                      → {task.assigned_to === "jorge" ? "Jorge" : "Nancy"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => markDone(task.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
                    >
                      Done ✓
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-slate-600 hover:text-red-400 transition-colors p-1"
                      title="Eliminar"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Completed Tasks */}
          <h2 className="text-lg font-semibold text-slate-400 mb-3">
            Completadas (últimos 7 días)
          </h2>
          {completed.length === 0 ? (
            <p className="text-slate-600 text-sm">Nada completado aún</p>
          ) : (
            <div className="space-y-2">
              {completed.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-800/20 border border-slate-800/50"
                >
                  <div>
                    <p className="text-slate-500 line-through text-sm">
                      {task.title}
                    </p>
                    <p className="text-xs text-slate-600">
                      ✓ {nameFromEmail(task.completed_by)} ·{" "}
                      {task.completed_at ? timeAgo(task.completed_at) : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-slate-700 hover:text-red-400 transition-colors p-1"
                    title="Eliminar"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
