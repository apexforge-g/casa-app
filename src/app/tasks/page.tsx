"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

interface Task {
  id: string;
  title: string;
  assignee_email: string;
  status: "pending" | "done";
  created_at: string;
}

const ASSIGNEES = [
  { email: "jorge@casa-app.local", name: "Jorge" },
  { email: "nancy@casa-app.local", name: "Nancy" },
];

function assigneeName(email: string) {
  return ASSIGNEES.find((a) => a.email === email)?.name ?? email;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState(ASSIGNEES[0].email);
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  async function fetchTasks() {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    setTasks(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    await supabase.from("tasks").insert({ title: title.trim(), assignee_email: assignee });
    setTitle("");
    await fetchTasks();
    setSubmitting(false);
  }

  async function toggleStatus(task: Task) {
    const newStatus = task.status === "pending" ? "done" : "pending";
    await supabase.from("tasks").update({ status: newStatus }).eq("id", task.id);
    await fetchTasks();
  }

  async function deleteTask(id: string) {
    await supabase.from("tasks").delete().eq("id", id);
    await fetchTasks();
  }

  return (
    <main className="min-h-screen px-4 py-12 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Tareas
        </h1>
        <Link
          href="/"
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          Inicio
        </Link>
      </div>

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
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white focus:outline-none focus:border-blue-500 transition-colors"
        >
          {ASSIGNEES.map((a) => (
            <option key={a.email} value={a.email}>
              {a.name}
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

      {/* Task List */}
      {loading ? (
        <p className="text-slate-400 text-center py-8">Cargando...</p>
      ) : tasks.length === 0 ? (
        <p className="text-slate-400 text-center py-8">No hay tareas aún</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleStatus(task)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    task.status === "done"
                      ? "bg-emerald-400 border-emerald-400 text-black"
                      : "border-amber-400 hover:bg-amber-400/20"
                  }`}
                  title={task.status === "done" ? "Marcar pendiente" : "Marcar hecho"}
                >
                  {task.status === "done" && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <div>
                  <p
                    className={`font-medium ${
                      task.status === "done"
                        ? "line-through text-slate-500"
                        : "text-white"
                    }`}
                  >
                    {task.title}
                  </p>
                  <p className="text-sm text-slate-400">{assigneeName(task.assignee_email)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-3 py-1 rounded-full font-medium ${
                    task.status === "done"
                      ? "bg-emerald-400/10 text-emerald-400"
                      : "bg-amber-400/10 text-amber-400"
                  }`}
                >
                  {task.status === "done" ? "Hecho" : "Pendiente"}
                </span>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-red-400/60 hover:text-red-400 transition-colors p-1"
                  title="Eliminar"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
