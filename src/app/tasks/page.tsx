"use client";

import { useState, useMemo } from "react";
import { useData } from "@/context/DataContext";
import FilterChips from "@/components/FilterChips";
import TaskCard from "@/components/TaskCard";
import CreateTaskSheet from "@/components/CreateTaskSheet";

export default function TasksPage() {
  const {
    tasks, categories, userId, userMap, users, bills, payments,
    completeTask, deleteTask, createTask,
  } = useData();
  const [filter, setFilter] = useState("todas");
  const [sheetOpen, setSheetOpen] = useState(false);

  const billsBanner = useMemo(() => {
    const now = new Date();
    const today = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const dueSoon = bills.filter(b => {
      const payment = payments.find(p => p.bill_id === b.id);
      if (payment?.paid) return false;
      const daysUntil = b.due_day - today;
      return daysUntil >= -2 && daysUntil <= 7;
    });
    return dueSoon.length > 0
      ? `⚠️ ${dueSoon.length} cuenta${dueSoon.length > 1 ? "s" : ""} por vencer esta semana`
      : "";
  }, [bills, payments]);

  const filteredTasks = tasks.filter(t => {
    if (filter === "mias") return t.assigned_to === userId || t.assigned_to === "both";
    if (filter === "pendientes") return t.status === "pending";
    return true;
  });

  const grouped = filteredTasks.reduce((acc, task) => {
    const catName = task.categories?.name || "Sin categoría";
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(task);
    return acc;
  }, {} as Record<string, typeof tasks>);

  const handleComplete = async (id: string) => { await completeTask(id); };
  const handleDelete = async (id: string) => { await deleteTask(id); };
  const handleCreate = async (data: {
    title: string;
    category_id: string | null;
    assigned_to: string;
    priority: "alta" | "media" | "baja";
    due_date: string | null;
    budget: number | null;
    currency: string;
  }) => { await createTask(data); };

  return (
    <div className="max-w-lg mx-auto">
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-bold">🏠 Tareas</h1>
        <p className="text-sm text-slate-500 mt-1">{tasks.length} pendientes</p>
      </div>

      {billsBanner && (
        <a href="/tasks/cuentas" className="block mx-4 mb-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <span className="text-sm text-amber-400 font-medium">{billsBanner}</span>
        </a>
      )}

      <FilterChips active={filter} onChange={setFilter} />

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
              {catTasks.map(task => (
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
