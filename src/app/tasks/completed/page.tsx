"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import { Task } from "@/types";
import CategoryBadge from "@/components/CategoryBadge";
import CompletedStats from "@/components/CompletedStats";

function getWeekLabel(date: Date): string {
  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - now.getDay());
  startOfThisWeek.setHours(0, 0, 0, 0);

  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  if (date >= startOfThisWeek) return "Esta semana";
  if (date >= startOfLastWeek) return "Semana pasada";

  return `Semana del ${date.toLocaleDateString("es-CL", { day: "numeric", month: "short" })}`;
}

export default function CompletedPage() {
  const supabase = useMemo(() => createClient(), []);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState("all");

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const name = user.email?.split("@")[0] || "Yo";
    const capitalName = name.charAt(0).toUpperCase() + name.slice(1);

    const [taskRes, catRes] = await Promise.all([
      supabase.from("tasks").select("*").eq("status", "completed").order("completed_at", { ascending: false }),
      supabase.from("categories").select("*"),
    ]);

    const catMap = Object.fromEntries((catRes.data || []).map(c => [c.id, c]));
    const taskList = (taskRes.data || []).map((t: Task) => ({ ...t, categories: t.category_id ? catMap[t.category_id] : undefined }));
    setTasks(taskList);

    const map: Record<string, string> = { [user.id]: capitalName };
    taskList.forEach((t: Task) => {
      if (t.completed_by && !map[t.completed_by]) map[t.completed_by] = "Otro";
      if (t.created_by && !map[t.created_by]) map[t.created_by] = "Otro";
    });
    setUserMap(map);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = filterUser === "all"
    ? tasks
    : tasks.filter((t) => t.completed_by === filterUser);

  // Group by week
  const grouped: Record<string, Task[]> = {};
  filtered.forEach((t) => {
    const d = new Date(t.completed_at || t.created_at);
    const label = getWeekLabel(d);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(t);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-500 text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-bold">✅ Completadas</h1>
        <p className="text-sm text-slate-500 mt-1">{tasks.length} tareas hechas</p>
      </div>

      {/* Filter by user */}
      <div className="flex gap-2 px-4 py-3">
        <button
          onClick={() => setFilterUser("all")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            filterUser === "all"
              ? "bg-green-500 text-white"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          Todos
        </button>
        {Object.entries(userMap).map(([uid, name]) => (
          <button
            key={uid}
            onClick={() => setFilterUser(uid)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filterUser === uid
                ? "bg-green-500 text-white"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-4 pb-4">
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <p className="text-4xl mb-3">📭</p>
            <p>Aún no hay tareas completadas</p>
          </div>
        )}
        {Object.entries(grouped).map(([weekLabel, weekTasks]) => {
          const byUser: Record<string, number> = {};
          weekTasks.forEach((t) => {
            const uid = t.completed_by || "unknown";
            byUser[uid] = (byUser[uid] || 0) + 1;
          });

          return (
            <div key={weekLabel}>
              <CompletedStats
                total={weekTasks.length}
                byUser={byUser}
                userMap={userMap}
                label={weekLabel}
              />
              <div className="space-y-2">
                {weekTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-slate-800/40 rounded-xl p-3 flex items-center gap-3"
                  >
                    <span className="text-green-400">✓</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 line-through">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {task.categories && <CategoryBadge category={task.categories} />}
                        <span className="text-xs text-slate-600">
                          {task.completed_at
                            ? new Date(task.completed_at).toLocaleDateString("es-CL", {
                                day: "numeric",
                                month: "short",
                              })
                            : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
