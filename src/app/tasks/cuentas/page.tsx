"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import { Bill, BillPayment, BILL_CATEGORIES } from "@/types";
import Link from "next/link";

export default function CuentasPage() {
  const supabase = useMemo(() => createClient(), []);
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyPayments, setHistoryPayments] = useState<BillPayment[]>([]);

  // Form state
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDueDay, setNewDueDay] = useState("1");
  const [newCategory, setNewCategory] = useState("Servicios");

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [billsRes, paymentsRes] = await Promise.all([
      supabase.from("bills").select("*").order("due_day"),
      supabase.from("bill_payments").select("*").eq("month", currentMonth).eq("year", currentYear),
    ]);

    const billsList = billsRes.data || [];
    setBills(billsList);

    // Helper to map bill data onto payments client-side
    const mapBills = (payments: BillPayment[]) =>
      payments.map(p => ({ ...p, bills: billsList.find((b: Bill) => b.id === p.bill_id) || undefined }));

    // Ensure payments exist for all bills this month
    const existingBillIds = new Set((paymentsRes.data || []).map((p: BillPayment) => p.bill_id));
    const missing = billsList.filter((b: Bill) => !existingBillIds.has(b.id));

    if (missing.length > 0) {
      const inserts = missing.map((b: Bill) => ({
        bill_id: b.id,
        month: currentMonth,
        year: currentYear,
      }));
      await supabase.from("bill_payments").insert(inserts);
      const { data: refreshed } = await supabase
        .from("bill_payments").select("*").eq("month", currentMonth).eq("year", currentYear);
      setPayments(mapBills(refreshed || []));
    } else {
      setPayments(mapBills(paymentsRes.data || []));
    }

    // Auto-create tasks for bills due soon
    await autoCreateTasks(billsList, paymentsRes.data || [], user.id);

    setLoading(false);
  }, [supabase, currentMonth, currentYear]);

  const autoCreateTasks = async (billsList: Bill[], paymentsList: BillPayment[], uid: string) => {
    const today = now.getDate();
    for (const bill of billsList) {
      const payment = paymentsList.find((p: BillPayment) => p.bill_id === bill.id);
      if (!payment || payment.paid || payment.task_id) continue;

      const daysUntilDue = bill.due_day - today;
      if (daysUntilDue <= bill.auto_create_task_days && daysUntilDue >= -5) {
        // Find Pagos/Cuentas category
        const { data: cats } = await supabase.from("categories").select("id").eq("name", "Pagos/Cuentas").limit(1);
        const catId = cats?.[0]?.id || null;

        const { data: task } = await supabase
          .from("tasks")
          .insert({
            title: `💰 Pagar ${bill.name}`,
            category_id: catId,
            assigned_to: "both",
            priority: "alta",
            due_date: `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(bill.due_day).padStart(2, "0")}`,
            created_by: uid,
            status: "pending",
          })
          .select()
          .single();

        if (task) {
          await supabase.from("bill_payments").update({ task_id: task.id }).eq("id", payment.id);
        }
      }
    }
  };

  useEffect(() => { loadData(); }, [loadData]);

  const togglePaid = async (payment: BillPayment) => {
    const newPaid = !payment.paid;
    const updates: Record<string, unknown> = {
      paid: newPaid,
      paid_by: newPaid ? userId : null,
      paid_at: newPaid ? new Date().toISOString() : null,
    };

    await supabase.from("bill_payments").update(updates).eq("id", payment.id);

    // If linked task exists, complete/uncomplete it
    if (payment.task_id) {
      if (newPaid) {
        await supabase.from("tasks").update({
          status: "completed",
          completed_by: userId,
          completed_at: new Date().toISOString(),
        }).eq("id", payment.task_id);
      } else {
        await supabase.from("tasks").update({
          status: "pending",
          completed_by: null,
          completed_at: null,
        }).eq("id", payment.task_id);
      }
    }

    setPayments(prev => prev.map(p =>
      p.id === payment.id ? { ...p, ...updates } as BillPayment : p
    ));
  };

  const addBill = async () => {
    if (!newName.trim()) return;
    const { data } = await supabase
      .from("bills")
      .insert({
        name: newName.trim(),
        amount: newAmount ? parseFloat(newAmount) : null,
        due_day: parseInt(newDueDay),
        category: newCategory,
        created_by: userId,
      })
      .select()
      .single();

    if (data) {
      setBills(prev => [...prev, data]);
      // Create payment for current month
      const { data: payment } = await supabase
        .from("bill_payments")
        .insert({ bill_id: data.id, month: currentMonth, year: currentYear })
        .select("*")
        .single();
      if (payment) setPayments(prev => [...prev, { ...payment, bills: data }]);
      setNewName("");
      setNewAmount("");
      setNewDueDay("1");
      setShowAdd(false);
    }
  };

  const deleteBill = async (id: string) => {
    await supabase.from("bills").delete().eq("id", id);
    setBills(prev => prev.filter(b => b.id !== id));
    setPayments(prev => prev.filter(p => p.bill_id !== id));
  };

  const loadHistory = async () => {
    const months: { m: number; y: number }[] = [];
    for (let i = 1; i <= 3; i++) {
      let m = currentMonth - i;
      let y = currentYear;
      if (m <= 0) { m += 12; y--; }
      months.push({ m, y });
    }

    const allPayments: BillPayment[] = [];
    for (const { m, y } of months) {
      const { data } = await supabase
        .from("bill_payments")
        .select("*")
        .eq("month", m)
        .eq("year", y);
      if (data) allPayments.push(...data.map(p => ({ ...p, bills: bills.find((b: Bill) => b.id === p.bill_id) || undefined })));
    }
    setHistoryPayments(allPayments);
    setShowHistory(true);
  };

  const getStatus = (bill: Bill, payment: BillPayment | undefined) => {
    if (payment?.paid) return { label: "✅ Pagado", color: "text-green-400" };
    const daysUntil = bill.due_day - now.getDate();
    if (daysUntil <= 3 && daysUntil >= -5) return { label: "⚠️ Vence pronto", color: "text-amber-400" };
    return { label: "⏳ Pendiente", color: "text-slate-400" };
  };

  const MONTH_NAMES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><div className="text-slate-500 text-lg">Cargando...</div></div>;
  }

  return (
    <div className="max-w-lg mx-auto pb-24">
      <div className="px-4 pt-6 pb-2 flex items-center gap-3">
        <Link href="/tasks/config" className="text-slate-400 text-lg">←</Link>
        <h1 className="text-2xl font-bold">💰 Cuentas</h1>
      </div>

      {/* Add button */}
      <div className="px-4 mb-4">
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-blue-400 text-sm font-medium"
        >
          {showAdd ? "Cancelar" : "+ Agregar cuenta"}
        </button>
      </div>

      {showAdd && (
        <div className="mx-4 bg-slate-800/60 rounded-xl p-4 mb-4 space-y-3">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nombre (ej: Internet, Luz)"
            className="w-full px-3 py-2 bg-slate-700 rounded-lg border border-slate-600 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={newAmount}
              onChange={e => setNewAmount(e.target.value)}
              placeholder="Monto (opcional)"
              className="flex-1 px-3 py-2 bg-slate-700 rounded-lg border border-slate-600 text-white text-sm focus:outline-none focus:border-blue-500"
            />
            <select
              value={newDueDay}
              onChange={e => setNewDueDay(e.target.value)}
              className="w-20 px-2 py-2 bg-slate-700 rounded-lg border border-slate-600 text-white text-sm"
            >
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i + 1} value={i + 1}>Día {i + 1}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-700 rounded-lg border border-slate-600 text-white text-sm"
            >
              {BILL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={addBill} className="px-6 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg">
              Agregar
            </button>
          </div>
        </div>
      )}

      {/* Bills list */}
      <div className="px-4 space-y-2">
        {bills.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p className="text-4xl mb-3">💰</p>
            <p>No hay cuentas registradas</p>
          </div>
        )}
        {bills.map(bill => {
          const payment = payments.find(p => p.bill_id === bill.id);
          const status = getStatus(bill, payment);
          return (
            <div
              key={bill.id}
              className="bg-slate-800/60 rounded-xl p-4 flex items-center gap-3"
            >
              <button
                onClick={() => payment && togglePaid(payment)}
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                  payment?.paid
                    ? "bg-green-500 border-green-500 text-white"
                    : "border-slate-600 hover:border-green-500"
                }`}
              >
                {payment?.paid && "✓"}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{bill.name}</span>
                  {bill.amount && (
                    <span className="text-xs text-slate-500">${bill.amount.toLocaleString("es-CL")}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500">Día {bill.due_day}</span>
                  <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                </div>
              </div>
              <button onClick={() => deleteBill(bill.id)} className="text-slate-600 hover:text-red-400 text-sm p-1">✕</button>
            </div>
          );
        })}
      </div>

      {/* History */}
      <div className="px-4 mt-6">
        <button onClick={loadHistory} className="text-blue-400 text-sm font-medium">
          {showHistory ? "Ocultar historial" : "📅 Ver historial (últimos 3 meses)"}
        </button>
        {showHistory && (
          <div className="mt-3 space-y-3">
            {[1, 2, 3].map(offset => {
              let m = currentMonth - offset;
              let y = currentYear;
              if (m <= 0) { m += 12; y--; }
              const monthPayments = historyPayments.filter(p => p.month === m && p.year === y);
              const paid = monthPayments.filter(p => p.paid).length;
              return (
                <div key={`${m}-${y}`} className="bg-slate-800/40 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{MONTH_NAMES[m]} {y}</span>
                    <span className="text-xs text-slate-500">{paid}/{monthPayments.length} pagadas</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {monthPayments.map(p => (
                      <span key={p.id} className={`text-xs px-2 py-0.5 rounded-full ${p.paid ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                        {p.bills?.name || "?"}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
