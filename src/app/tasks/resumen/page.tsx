"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import { Task, Bill, BillPayment, Routine } from "@/types";
import Link from "next/link";

function timeAgo(date: string | null): string {
  if (!date) return "Nunca";
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  return `Hace ${days} días`;
}

export default function ResumenPage() {
  const supabase = useMemo(() => createClient(), []);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const name = user.email?.split("@")[0] || "Yo";
    const map: Record<string, string> = { [user.id]: name.charAt(0).toUpperCase() + name.slice(1) };

    const [tasksRes, billsRes, paymentsRes, routinesRes] = await Promise.all([
      supabase.from("tasks").select("*").eq("status", "completed").order("completed_at", { ascending: false }).limit(20),
      supabase.from("bills").select("*").order("due_day"),
      supabase.from("bill_payments").select("*, bills(*)").eq("month", currentMonth).eq("year", currentYear),
      supabase.from("routines").select("*").order("created_at"),
    ]);

    setCompletedTasks(tasksRes.data || []);
    setBills(billsRes.data || []);
    setPayments(paymentsRes.data || []);
    setRoutines(routinesRes.data || []);

    (tasksRes.data || []).forEach((t: Task) => {
      if (t.completed_by && !map[t.completed_by]) map[t.completed_by] = "Otro";
    });
    setUserMap(map);
    setLoading(false);
  }, [supabase, currentMonth, currentYear]);

  useEffect(() => { loadData(); }, [loadData]);

  const paidCount = payments.filter(p => p.paid).length;
  const overdueRoutines = routines.filter(r => {
    if (!r.last_done_at) return true;
    return (Date.now() - new Date(r.last_done_at).getTime()) / (1000 * 60 * 60 * 24) > r.frequency_days;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><div className="text-slate-500 text-lg">Cargando...</div></div>;
  }

  return (
    <div className="max-w-lg mx-auto pb-24">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold">📊 Resumen</h1>
      </div>

      {/* Quick stats */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-6">
        <div className="bg-slate-800/60 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{paidCount}/{bills.length}</p>
          <p className="text-xs text-slate-500 mt-1">Cuentas pagadas</p>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-amber-400">{overdueRoutines.length}</p>
          <p className="text-xs text-slate-500 mt-1">Rutinas atrasadas</p>
        </div>
      </div>

      {/* Bills status */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">💰 Cuentas del mes</h2>
          <Link href="/tasks/cuentas" className="text-blue-400 text-sm">Ver todas →</Link>
        </div>
        <div className="space-y-2">
          {bills.length === 0 && <p className="text-sm text-slate-500">Sin cuentas registradas</p>}
          {bills.map(bill => {
            const payment = payments.find(p => p.bill_id === bill.id);
            return (
              <div key={bill.id} className="bg-slate-800/40 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm">{bill.name}</span>
                <span className={`text-xs font-medium ${payment?.paid ? "text-green-400" : "text-slate-400"}`}>
                  {payment?.paid ? "✅ Pagado" : `⏳ Día ${bill.due_day}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Routines status */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">🧹 Rutinas</h2>
          <Link href="/tasks/rutinas" className="text-blue-400 text-sm">Ver todas →</Link>
        </div>
        <div className="space-y-2">
          {routines.length === 0 && <p className="text-sm text-slate-500">Sin rutinas registradas</p>}
          {routines.map(routine => {
            const isOverdue = !routine.last_done_at || (Date.now() - new Date(routine.last_done_at).getTime()) / (1000 * 60 * 60 * 24) > routine.frequency_days;
            return (
              <div key={routine.id} className="bg-slate-800/40 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm">{routine.name}</span>
                <span className={`text-xs font-medium ${isOverdue ? "text-red-400" : "text-green-400"}`}>
                  {timeAgo(routine.last_done_at)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent completed tasks */}
      <div className="px-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">✅ Tareas completadas</h2>
        <div className="space-y-2">
          {completedTasks.length === 0 && <p className="text-sm text-slate-500">Sin tareas completadas</p>}
          {completedTasks.slice(0, 10).map(task => (
            <div key={task.id} className="bg-slate-800/40 rounded-lg p-3 flex items-center gap-3">
              <span className="text-green-400 text-sm">✓</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-300 line-through truncate">{task.title}</p>
                <p className="text-xs text-slate-600">
                  {task.completed_by ? userMap[task.completed_by] || "?" : ""} • {task.completed_at ? new Date(task.completed_at).toLocaleDateString("es-CL", { day: "numeric", month: "short" }) : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
