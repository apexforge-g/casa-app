"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Task, Category } from "@/types";
import FilterChips from "@/components/FilterChips";
import TaskCard from "@/components/TaskCard";
import CreateTaskSheet from "@/components/CreateTaskSheet";

export default function TasksPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState("todas");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setUserId(user.id);

    // Build user map from known users
    const name = user.email?.split("@")[0] || "Yo";
    const capitalName = name.charAt(0).toUpperCase() + name.slice(1);

    // Fetch all tasks to discover other user IDs
    const [catRes, taskRes] = await Promise.all([
      supabase.from("categories").select("*").order("created_at"),
      supabase
        .from("tasks")
        .select("*, categories(*)")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);

    setCategories(catRes.data || []);
    setTasks(taskRes.data || []);

    // Build user map from task data
    const map: Record<string, string> = { [user.id]: capitalName };
    (taskRes.data || []).forEach((t: Task) => {
      if (t.created_by && !map[t.created_by]) {
        map[t.created_by] = "Otro";
      }
    });

    // Hardcode known users for simplicity
    const allUsers = Object.entries(map).map(([id, n]) => ({ id, name: n }));
    setUserMap(map);
    setUsers(allUsers);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredTasks = tasks.filter((t) => {
    if (filter === "mias") return t.assigned_to === userId || t.assigned_to === "both";
    if (filter === "pendientes") return t.status === "pending";
    return true;
  });

  // Group by category
  const grouped = filteredTasks.reduce((acc, task) => {
    const catName = task.categories?.name || "Sin categoría";
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const handleComplete = async (id: string) => {
    await supabase
      .from("tasks")
      .update({ status: "completed", completed_by: userId, completed_at: new Date().toISOString() })
      .eq("id", id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleDelete = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleCreate = async (data: {
    title: string;
    category_id: string | null;
    assigned_to: string;
    priority: "alta" | "media" | "baja";
    due_date: string | null;
  }) => {
    const { data: newTask } = await supabase
      .from("tasks")
      .insert({ ...data, created_by: userId, status: "pending" })
      .select("*, categories(*)")
      .single();
    if (newTask) setTasks((prev) => [newTask, ...prev]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-500 text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-bold">🏠 Tareas</h1>
        <p className="text-sm text-slate-500 mt-1">{tasks.length} pendientes</p>
      </div>

      <FilterChips active={filter} onChange={setFilter} />

      {/* Task groups */}
      <div className="px-4 space-y-6 pb-4">
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-lg font-medium">¡Sin tareas pendientes!</p>
            <p className="text-sm mt-1">Toca + para agregar una</p>
          </div>
        )}
        {Object.entries(grouped).map(([catName, catTasks]) => (
          <div key={catName}>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
              {catTasks[0]?.categories?.emoji} {catName}
            </h2>
            <div className="space-y-2">
              {catTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  userId={userId}
                  onComplete={handleComplete}
                  onDelete={handleDelete}
                  userMap={userMap}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center text-2xl transition-transform hover:scale-105 active:scale-95 z-40"
      >
        +
      </button>

      <CreateTaskSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSubmit={handleCreate}
        categories={categories}
        users={users}
      />
    </div>
  );
}
