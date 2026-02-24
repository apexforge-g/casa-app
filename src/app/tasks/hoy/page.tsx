"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Task, Category, Bill, BillPayment, Routine, GroceryItem } from "@/types";
import CreateTaskSheet from "@/components/CreateTaskSheet";
import Link from "next/link";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

function formatCLP(amount: number): string {
  return "$" + new Intl.NumberFormat("es-CL").format(amount);
}

function getRoutineProgress(routine: Routine): number {
  if (!routine.last_done_at) return 100;
  const elapsed = (Date.now() - new Date(routine.last_done_at).getTime()) / (1000 * 60 * 60 * 24);
  return Math.min(100, Math.round((elapsed / routine.frequency_days) * 100));
}

function getRoutineStatusColor(routine: Routine): string {
  const pct = getRoutineProgress(routine);
  if (pct < 50) return "bg-green-500";
  if (pct <= 100) return "bg-amber-500";
  return "bg-red-500";
}

function isRoutineOverdue(routine: Routine): boolean {
  if (!routine.last_done_at) return true;
  const elapsed = (Date.now() - new Date(routine.last_done_at).getTime()) / (1000 * 60 * 60 * 24);
  return elapsed > routine.frequency_days;
}

export default function HoyPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [groceryNeeded, setGroceryNeeded] = useState(0);
  const [completedThisWeek, setCompletedThisWeek] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const name = user.email?.split("@")[0] || "Yo";
    const capitalName = name.charAt(0).toUpperCase() + name.slice(1);
    setUserName(capitalName);
    setUserId(user.id);

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    try {
    const [catRes, taskRes, billRes, payRes, routRes, grocRes, completedRes] = await Promise.all([
      supabase.from("categories").select("*").order("created_at"),
      supabase.from("tasks").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("bills").select("*"),
      supabase.from("bill_payments").select("*").eq("month", month).eq("year", year),
      supabase.from("routines").select("*").order("created_at"),
      supabase.from("grocery_items").select("*").in("status", ["needed", "low"]),
      supabase.from("tasks").select("id", { count: "exact" }).eq("status", "completed").gte("completed_at", new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString()),
    ]);

    const tasksData = taskRes.data || [];
    const billsData = billRes.data || [];
    const routinesData = routRes.data || [];

    // Check if we need to seed
    if (tasksData.length === 0 && billsData.length === 0 && routinesData.length === 0) {
      try {
        await fetch("/api/seed", { method: "POST" });
        setTimeout(() => loadData(), 500);
        return;
      } catch {
        // Seed failed, continue with empty data
      }
    }

    const cats = catRes.data || [];
    const catMap = Object.fromEntries(cats.map(c => [c.id, c]));
    setCategories(cats);
    const tasksWithCats = tasksData.map((t: Task) => ({ ...t, categories: t.category_id ? catMap[t.category_id] : undefined }));
    setTasks(tasksWithCats);
    setBills(billsData);

    // Map bill data onto payments client-side
    const paymentsData = (payRes.data || []).map((p: BillPayment) => ({
      ...p,
      bills: billsData.find((b: Bill) => b.id === p.bill_id) || undefined,
    }));
    setPayments(paymentsData);
    setRoutines(routinesData);
    setGroceryNeeded(grocRes.data?.length || 0);
    setCompletedThisWeek(completedRes.count || 0);

    const map: Record<string, string> = { [user.id]: capitalName };
    tasksData.forEach((t: Task) => {
      if (t.created_by && !map[t.created_by]) map[t.created_by] = "Otro";
    });
    setUserMap(map);
    setUsers(Object.entries(map).map(([id, n]) => ({ id, name: n })));
    } catch (err) {
      console.error("Error loading hoy data:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => { loadData(); }, [loadData]);

  // Derived data
  const today = new Date().toISOString().slice(0, 10);
  const todayDate = new Date().getDate();

  const pendingTasks = tasks.filter(t => t.status === "pending");
  const todayTasks = pendingTasks.filter(t =>
    (t.assigned_to === userId || t.assigned_to === "both") &&
    (!t.due_date || t.due_date <= today)
  ).sort((a, b) => {
    const prio = { alta: 0, media: 1, baja: 2 };
    return prio[a.priority] - prio[b.priority];
  });

  const budgetTotal = pendingTasks.filter(t => t.budget).reduce((sum, t) => sum + (t.budget || 0), 0);

  // Urgent items
  const urgentBills = bills.filter(b => {
    const payment = payments.find(p => p.bill_id === b.id);
    if (payment?.paid) return false;
    const daysUntil = b.due_day - todayDate;
    return daysUntil >= -2 && daysUntil <= 3;
  });

  const overdueRoutines = routines.filter(isRoutineOverdue);
  const highPriorityTasks = pendingTasks.filter(t => t.priority === "alta");
  const hasUrgent = urgentBills.length > 0 || overdueRoutines.length > 0 || highPriorityTasks.length > 0;

  // Routines sorted by urgency
  const sortedRoutines = [...routines].sort((a, b) => getRoutineProgress(b) - getRoutineProgress(a)).slice(0, 5);

  const handleComplete = async (id: string) => {
    await supabase.from("tasks").update({ status: "completed", completed_by: userId, completed_at: new Date().toISOString() }).eq("id", id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleCreate = async (data: {
    title: string;
    category_id: string | null;
    assigned_to: string;
    priority: "alta" | "media" | "baja";
    due_date: string | null;
    budget: number | null;
    currency: string;
  }) => {
    const { data: newTask } = await supabase
      .from("tasks")
      .insert({ ...data, created_by: userId, status: "pending" })
      .select("*")
      .single();
    if (newTask) {
      const cat = categories.find(c => c.id === newTask.category_id);
      setTasks(prev => [{ ...newTask, categories: cat }, ...prev]);
    }
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
        <h1 className="text-2xl font-bold">{getGreeting()}, {userName} 👋</h1>
      </div>

      {/* Quick Stats */}
      <div className="px-4 py-3 flex gap-3">
        <div className="flex-1 bg-slate-800/60 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-400">{pendingTasks.length}</p>
          <p className="text-xs text-slate-500">pendientes</p>
        </div>
        <div className="flex-1 bg-slate-800/60 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-400">{todayTasks.length}</p>
          <p className="text-xs text-slate-500">para hoy</p>
        </div>
        <div className="flex-1 bg-slate-800/60 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-400">{completedThisWeek}</p>
          <p className="text-xs text-slate-500">esta semana</p>
        </div>
      </div>

      {/* Budget summary */}
      {budgetTotal > 0 && (
        <div className="mx-4 mb-3 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <span className="text-sm text-emerald-400 font-medium">💰 Pendientes con presupuesto: {formatCLP(budgetTotal)} total</span>
        </div>
      )}

      {/* Urgent section */}
      {hasUrgent && (
        <div className="mx-4 mb-4">
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-2 px-1">⚠️ Urgente</h2>
          <div className="space-y-2">
            {urgentBills.map(b => (
              <Link key={b.id} href="/tasks/cuentas" className="block bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <span>💰</span>
                  <span className="text-sm text-red-300">{b.name} — vence día {b.due_day}</span>
                  {b.amount && <span className="ml-auto text-xs text-red-400">{formatCLP(b.amount)}</span>}
                </div>
              </Link>
            ))}
            {overdueRoutines.map(r => (
              <Link key={r.id} href="/tasks/rutinas" className="block bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <span>🧹</span>
                  <span className="text-sm text-red-300">{r.name} — atrasada</span>
                </div>
              </Link>
            ))}
            {highPriorityTasks.map(t => (
              <div key={t.id} className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3">
                <button
                  onClick={() => handleComplete(t.id)}
                  className="w-5 h-5 rounded-full border-2 border-red-500/50 flex-shrink-0 hover:bg-red-400/20"
                />
                <span className="text-sm text-red-300">{t.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My tasks today */}
      <div className="mx-4 mb-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">📋 Mis tareas de hoy</h2>
        {todayTasks.length === 0 ? (
          <div className="bg-slate-800/40 rounded-xl p-4 text-center text-slate-500 text-sm">
            🎉 ¡Sin tareas para hoy!
          </div>
        ) : (
          <div className="space-y-2">
            {todayTasks.slice(0, 8).map(task => (
              <div key={task.id} className="bg-slate-800/60 rounded-xl p-3 flex items-center gap-3">
                <button
                  onClick={() => handleComplete(task.id)}
                  className="w-5 h-5 rounded-full border-2 border-slate-600 flex-shrink-0 hover:border-green-400 hover:bg-green-400/20 transition-colors"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-100 truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {task.categories && (
                      <span className="text-xs text-slate-500">{task.categories.emoji} {task.categories.name}</span>
                    )}
                    <span className={`w-2 h-2 rounded-full ${
                      task.priority === "alta" ? "bg-red-500" : task.priority === "media" ? "bg-yellow-500" : "bg-green-500"
                    }`} />
                    {task.budget && (
                      <span className="text-xs text-emerald-400">💰 {formatCLP(task.budget)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {todayTasks.length > 8 && (
              <Link href="/tasks" className="block text-center text-sm text-blue-400 py-2">
                Ver {todayTasks.length - 8} más →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Grocery */}
      <Link href="/tasks/lista" className="block mx-4 mb-4 bg-slate-800/60 rounded-xl p-4 hover:bg-slate-800/80 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛒</span>
          <div>
            <p className="text-sm font-medium text-slate-100">Supermercado</p>
            <p className="text-xs text-slate-500">{groceryNeeded} cosas por comprar</p>
          </div>
          <span className="ml-auto text-slate-600">→</span>
        </div>
      </Link>

      {/* Routines */}
      <div className="mx-4 mb-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🧹 Rutinas</h2>
          <Link href="/tasks/rutinas" className="text-xs text-blue-400">Ver todas →</Link>
        </div>
        <div className="space-y-2">
          {sortedRoutines.map(routine => {
            const pct = getRoutineProgress(routine);
            const color = getRoutineStatusColor(routine);
            return (
              <div key={routine.id} className="bg-slate-800/60 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-slate-200">{routine.name}</span>
                  <span className="text-xs text-slate-500">{pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
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
