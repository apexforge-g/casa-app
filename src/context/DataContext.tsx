"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from "react";
import { createClient } from "@/lib/supabase";
import { Task, Category, Bill, BillPayment, Routine, GroceryItem } from "@/types";

interface DataContextType {
  user: { id: string; email: string } | null;
  userName: string;
  userId: string;
  tasks: Task[];
  completedTasks: Task[];
  categories: Category[];
  bills: Bill[];
  payments: BillPayment[];
  routines: Routine[];
  groceryItems: GroceryItem[];
  loading: boolean;
  userMap: Record<string, string>;
  users: { id: string; name: string }[];
  completedThisWeek: number;
  groceryNeeded: number;
  refresh: () => Promise<void>;
  refreshTasks: () => Promise<void>;
  refreshGrocery: () => Promise<void>;
  refreshBills: () => Promise<void>;
  refreshRoutines: () => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  createTask: (data: {
    title: string;
    category_id: string | null;
    assigned_to: string;
    priority: "alta" | "media" | "baja";
    due_date: string | null;
    budget: number | null;
    currency: string;
  }) => Promise<Task | null>;
  deleteTask: (id: string) => Promise<void>;
  updateGroceryStatus: (id: string, status: string) => Promise<void>;
  addGroceryItem: (data: { name: string; category: string }) => Promise<GroceryItem | null>;
  deleteGroceryItem: (id: string) => Promise<void>;
  toggleBillPaid: (payment: BillPayment) => Promise<void>;
  markRoutineDone: (routine: Routine) => Promise<void>;
  addCategory: (data: { name: string; emoji: string; color: string }) => Promise<Category | null>;
  deleteCategory: (id: string) => Promise<void>;
  addBill: (data: { name: string; amount: number | null; due_day: number; category: string }) => Promise<Bill | null>;
  deleteBill: (id: string) => Promise<void>;
  addRoutine: (data: { name: string; frequency_days: number; category: string }) => Promise<Routine | null>;
  deleteRoutine: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export function useData(): DataContextType {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [completedThisWeek, setCompletedThisWeek] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const categoriesRef = useRef<Category[]>([]);

  const mapTaskCategories = useCallback((taskList: Task[], cats: Category[]) => {
    const catMap = Object.fromEntries(cats.map(c => [c.id, c]));
    return taskList.map(t => ({ ...t, categories: t.category_id ? catMap[t.category_id] : undefined }));
  }, []);

  const buildUserMap = useCallback((uid: string, capitalName: string, taskList: Task[], completedList: Task[]) => {
    const map: Record<string, string> = { [uid]: capitalName };
    [...taskList, ...completedList].forEach(t => {
      if (t.created_by && !map[t.created_by]) map[t.created_by] = "Otro";
      if (t.completed_by && !map[t.completed_by]) map[t.completed_by] = "Otro";
    });
    return map;
  }, []);

  const fetchAll = useCallback(async (isInitial = false) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      if (isInitial) setLoading(false);
      return;
    }

    const name = authUser.email?.split("@")[0] || "Yo";
    const capitalName = name.charAt(0).toUpperCase() + name.slice(1);
    setUser({ id: authUser.id, email: authUser.email || "" });
    setUserName(capitalName);
    setUserId(authUser.id);

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();

    const [catRes, taskRes, completedRes, completedCountRes, billRes, payRes, routRes, grocRes] = await Promise.all([
      supabase.from("categories").select("*").order("created_at"),
      supabase.from("tasks").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").eq("status", "completed").order("completed_at", { ascending: false }),
      supabase.from("tasks").select("id", { count: "exact" }).eq("status", "completed").gte("completed_at", weekStart),
      supabase.from("bills").select("*").order("due_day"),
      supabase.from("bill_payments").select("*").eq("month", month).eq("year", year),
      supabase.from("routines").select("*").order("created_at"),
      supabase.from("grocery_items").select("*").order("category").order("name"),
    ]);

    const cats = catRes.data || [];
    categoriesRef.current = cats;
    setCategories(cats);

    const pendingTasks = mapTaskCategories(taskRes.data || [], cats);
    const doneTasks = mapTaskCategories(completedRes.data || [], cats);
    setTasks(pendingTasks);
    setCompletedTasks(doneTasks);
    setCompletedThisWeek(completedCountRes.count || 0);

    const billsData = billRes.data || [];
    setBills(billsData);

    // Map bills onto payments
    const paymentsData = (payRes.data || []).map((p: BillPayment) => ({
      ...p,
      bills: billsData.find((b: Bill) => b.id === p.bill_id) || undefined,
    }));

    // Ensure payments exist for all bills this month
    const existingBillIds = new Set(paymentsData.map((p: BillPayment) => p.bill_id));
    const missingBills = billsData.filter(b => !existingBillIds.has(b.id));
    if (missingBills.length > 0) {
      const inserts = missingBills.map(b => ({ bill_id: b.id, month, year }));
      await supabase.from("bill_payments").insert(inserts);
      const { data: refreshed } = await supabase.from("bill_payments").select("*").eq("month", month).eq("year", year);
      setPayments((refreshed || []).map((p: BillPayment) => ({
        ...p,
        bills: billsData.find((b: Bill) => b.id === p.bill_id) || undefined,
      })));
    } else {
      setPayments(paymentsData);
    }

    setRoutines(routRes.data || []);
    setGroceryItems(grocRes.data || []);

    const map = buildUserMap(authUser.id, capitalName, pendingTasks, doneTasks);
    setUserMap(map);
    setUsers(Object.entries(map).map(([id, n]) => ({ id, name: n })));

    if (isInitial) setLoading(false);
  }, [supabase, mapTaskCategories, buildUserMap]);

  const refresh = useCallback(() => fetchAll(false), [fetchAll]);

  const refreshTasks = useCallback(async () => {
    const [taskRes, completedRes] = await Promise.all([
      supabase.from("tasks").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").eq("status", "completed").order("completed_at", { ascending: false }),
    ]);
    setTasks(mapTaskCategories(taskRes.data || [], categoriesRef.current));
    setCompletedTasks(mapTaskCategories(completedRes.data || [], categoriesRef.current));
  }, [supabase, mapTaskCategories]);

  const refreshGrocery = useCallback(async () => {
    const { data } = await supabase.from("grocery_items").select("*").order("category").order("name");
    setGroceryItems(data || []);
  }, [supabase]);

  const refreshBills = useCallback(async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const [billRes, payRes] = await Promise.all([
      supabase.from("bills").select("*").order("due_day"),
      supabase.from("bill_payments").select("*").eq("month", month).eq("year", year),
    ]);
    const billsData = billRes.data || [];
    setBills(billsData);
    setPayments((payRes.data || []).map((p: BillPayment) => ({
      ...p,
      bills: billsData.find((b: Bill) => b.id === p.bill_id) || undefined,
    })));
  }, [supabase]);

  const refreshRoutines = useCallback(async () => {
    const { data } = await supabase.from("routines").select("*").order("created_at");
    setRoutines(data || []);
  }, [supabase]);

  // Optimistic mutations
  const completeTask = useCallback(async (id: string) => {
    const prev = tasks;
    setTasks(t => t.filter(x => x.id !== id));
    const task = prev.find(t => t.id === id);
    if (task) {
      setCompletedTasks(ct => [{ ...task, status: "completed" as const, completed_by: userId, completed_at: new Date().toISOString() }, ...ct]);
      setCompletedThisWeek(c => c + 1);
    }
    const { error } = await supabase.from("tasks").update({
      status: "completed",
      completed_by: userId,
      completed_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) {
      console.error("Failed to complete task:", error);
      setTasks(prev);
      if (task) {
        setCompletedTasks(ct => ct.filter(x => x.id !== id));
        setCompletedThisWeek(c => c - 1);
      }
    }
  }, [supabase, userId, tasks]);

  const createTask = useCallback(async (data: {
    title: string;
    category_id: string | null;
    assigned_to: string;
    priority: "alta" | "media" | "baja";
    due_date: string | null;
    budget: number | null;
    currency: string;
  }): Promise<Task | null> => {
    const tempId = "temp-" + Date.now();
    const cat = categoriesRef.current.find(c => c.id === data.category_id);
    const tempTask: Task = {
      id: tempId,
      ...data,
      status: "pending",
      created_by: userId,
      completed_by: null,
      completed_at: null,
      created_at: new Date().toISOString(),
      categories: cat,
    };
    setTasks(prev => [tempTask, ...prev]);

    const { data: newTask, error } = await supabase
      .from("tasks")
      .insert({ ...data, created_by: userId, status: "pending" })
      .select("*")
      .single();

    if (error || !newTask) {
      console.error("Failed to create task:", error);
      setTasks(prev => prev.filter(t => t.id !== tempId));
      return null;
    }

    setTasks(prev => prev.map(t => t.id === tempId ? { ...newTask, categories: cat } : t));
    return newTask;
  }, [supabase, userId]);

  const deleteTask = useCallback(async (id: string) => {
    const prev = tasks;
    setTasks(t => t.filter(x => x.id !== id));
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete task:", error);
      setTasks(prev);
    }
  }, [supabase, tasks]);

  const syncSupermarketTask = useCallback(async (items: GroceryItem[]) => {
    const neededCount = items.filter(i => i.status === "needed").length;
    const taskTitle = `🛒 Ir al supermercado (${neededCount} items)`;
    
    // Find existing supermarket task
    const { data: existingTasks } = await supabase
      .from("tasks")
      .select("*")
      .like("title", "🛒 Ir al supermercado%")
      .eq("status", "pending")
      .limit(1);
    
    const existingTask = existingTasks?.[0];
    
    if (neededCount > 0) {
      if (existingTask) {
        // Update count in title
        if (existingTask.title !== taskTitle) {
          await supabase.from("tasks").update({ title: taskTitle }).eq("id", existingTask.id);
        }
      } else {
        // Create new task
        await supabase.from("tasks").insert({
          title: taskTitle,
          status: "pending",
          priority: "media",
          assigned_to: userId,
          created_by: userId,
          currency: "CLP",
        });
      }
    } else if (existingTask) {
      // All done — complete the task
      await supabase.from("tasks").update({
        status: "completed",
        completed_by: userId,
        completed_at: new Date().toISOString(),
      }).eq("id", existingTask.id);
    }
    
    // Refresh tasks to reflect changes
    refreshTasks();
  }, [supabase, userId, refreshTasks]);

  const updateGroceryStatus = useCallback(async (id: string, status: string) => {
    const prev = groceryItems;
    const updates: Record<string, unknown> = { status };
    if (status === "stocked") updates.last_stocked_at = new Date().toISOString();
    const newItems = prev.map(i => i.id === id ? { ...i, status: status as GroceryItem["status"], ...(status === "stocked" ? { last_stocked_at: new Date().toISOString() } : {}) } : i);
    setGroceryItems(newItems);
    const { error } = await supabase.from("grocery_items").update(updates).eq("id", id);
    if (error) {
      console.error("Failed to update grocery status:", error);
      setGroceryItems(prev);
      return;
    }
    syncSupermarketTask(newItems);
  }, [supabase, groceryItems, syncSupermarketTask]);

  const addGroceryItem = useCallback(async (data: { name: string; category: string }): Promise<GroceryItem | null> => {
    const { data: item, error } = await supabase
      .from("grocery_items")
      .insert({ ...data, status: "needed" as const, created_by: userId })
      .select("*")
      .single();
    if (error || !item) {
      console.error("Failed to add grocery item:", error);
      return null;
    }
    const newItems = [...groceryItems, item];
    setGroceryItems(newItems);
    syncSupermarketTask(newItems);
    return item;
  }, [supabase, userId, groceryItems, syncSupermarketTask]);

  const deleteGroceryItem = useCallback(async (id: string) => {
    const prev = groceryItems;
    const newItems = prev.filter(i => i.id !== id);
    setGroceryItems(newItems);
    const { error } = await supabase.from("grocery_items").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete grocery item:", error);
      setGroceryItems(prev);
      return;
    }
    syncSupermarketTask(newItems);
  }, [supabase, groceryItems, syncSupermarketTask]);

  const toggleBillPaid = useCallback(async (payment: BillPayment) => {
    const newPaid = !payment.paid;
    const updates = {
      paid: newPaid,
      paid_by: newPaid ? userId : null,
      paid_at: newPaid ? new Date().toISOString() : null,
    };
    setPayments(prev => prev.map(p => p.id === payment.id ? { ...p, ...updates } as BillPayment : p));

    const { error } = await supabase.from("bill_payments").update(updates).eq("id", payment.id);
    if (error) {
      console.error("Failed to toggle bill payment:", error);
      setPayments(prev => prev.map(p => p.id === payment.id ? payment : p));
      return;
    }

    // Also update linked task
    if (payment.task_id) {
      if (newPaid) {
        await supabase.from("tasks").update({
          status: "completed", completed_by: userId, completed_at: new Date().toISOString(),
        }).eq("id", payment.task_id);
      } else {
        await supabase.from("tasks").update({
          status: "pending", completed_by: null, completed_at: null,
        }).eq("id", payment.task_id);
      }
    }
  }, [supabase, userId]);

  const markRoutineDone = useCallback(async (routine: Routine) => {
    const now = new Date().toISOString();
    setRoutines(prev => prev.map(r => r.id === routine.id ? { ...r, last_done_at: now, last_done_by: userId } : r));

    const { error } = await supabase.from("routines").update({ last_done_at: now, last_done_by: userId }).eq("id", routine.id);
    if (error) {
      console.error("Failed to mark routine done:", error);
      setRoutines(prev => prev.map(r => r.id === routine.id ? routine : r));
      return;
    }

    // Complete linked task
    const { data: linkedTasks } = await supabase
      .from("tasks").select("id").eq("title", `🧹 ${routine.name}`).eq("status", "pending").limit(1);
    if (linkedTasks && linkedTasks.length > 0) {
      await supabase.from("tasks").update({ status: "completed", completed_by: userId, completed_at: now }).eq("id", linkedTasks[0].id);
      setTasks(prev => prev.filter(t => t.id !== linkedTasks[0].id));
    }
  }, [supabase, userId]);

  const addCategory = useCallback(async (data: { name: string; emoji: string; color: string }): Promise<Category | null> => {
    const { data: cat, error } = await supabase
      .from("categories").insert({ ...data, user_id: userId }).select().single();
    if (error || !cat) { console.error("Failed to add category:", error); return null; }
    setCategories(prev => { const next = [...prev, cat]; categoriesRef.current = next; return next; });
    return cat;
  }, [supabase, userId]);

  const deleteCategory = useCallback(async (id: string) => {
    const prev = categories;
    setCategories(c => { const next = c.filter(x => x.id !== id); categoriesRef.current = next; return next; });
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) { console.error("Failed to delete category:", error); setCategories(prev); categoriesRef.current = prev; }
  }, [supabase, categories]);

  const addBill = useCallback(async (data: { name: string; amount: number | null; due_day: number; category: string }): Promise<Bill | null> => {
    const { data: bill, error } = await supabase
      .from("bills").insert({ ...data, created_by: userId }).select().single();
    if (error || !bill) { console.error("Failed to add bill:", error); return null; }
    setBills(prev => [...prev, bill]);
    // Create payment for current month
    const now = new Date();
    const { data: payment } = await supabase
      .from("bill_payments").insert({ bill_id: bill.id, month: now.getMonth() + 1, year: now.getFullYear() }).select("*").single();
    if (payment) setPayments(prev => [...prev, { ...payment, bills: bill }]);
    return bill;
  }, [supabase, userId]);

  const deleteBill = useCallback(async (id: string) => {
    const prev = bills;
    const prevPay = payments;
    setBills(b => b.filter(x => x.id !== id));
    setPayments(p => p.filter(x => x.bill_id !== id));
    const { error } = await supabase.from("bills").delete().eq("id", id);
    if (error) { console.error("Failed to delete bill:", error); setBills(prev); setPayments(prevPay); }
  }, [supabase, bills, payments]);

  const addRoutine = useCallback(async (data: { name: string; frequency_days: number; category: string }): Promise<Routine | null> => {
    const { data: routine, error } = await supabase
      .from("routines").insert({ ...data, created_by: userId }).select().single();
    if (error || !routine) { console.error("Failed to add routine:", error); return null; }
    setRoutines(prev => [...prev, routine]);
    return routine;
  }, [supabase, userId]);

  const deleteRoutine = useCallback(async (id: string) => {
    const prev = routines;
    setRoutines(r => r.filter(x => x.id !== id));
    const { error } = await supabase.from("routines").delete().eq("id", id);
    if (error) { console.error("Failed to delete routine:", error); setRoutines(prev); }
  }, [supabase, routines]);

  // Initial load
  useEffect(() => { fetchAll(true); }, [fetchAll]);

  // Background refresh on focus
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [refresh]);

  // Refresh every 60s
  useEffect(() => {
    intervalRef.current = setInterval(refresh, 60000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [refresh]);

  const groceryNeeded = useMemo(() =>
    groceryItems.filter(i => i.status === "needed").length,
  [groceryItems]);

  const value = useMemo<DataContextType>(() => ({
    user, userName, userId, tasks, completedTasks, categories, bills, payments, routines, groceryItems,
    loading, userMap, users, completedThisWeek, groceryNeeded,
    refresh, refreshTasks, refreshGrocery, refreshBills, refreshRoutines,
    completeTask, createTask, deleteTask,
    updateGroceryStatus, addGroceryItem, deleteGroceryItem,
    toggleBillPaid, markRoutineDone,
    addCategory, deleteCategory, addBill, deleteBill, addRoutine, deleteRoutine,
  }), [user, userName, userId, tasks, completedTasks, categories, bills, payments, routines, groceryItems,
    loading, userMap, users, completedThisWeek, groceryNeeded,
    refresh, refreshTasks, refreshGrocery, refreshBills, refreshRoutines,
    completeTask, createTask, deleteTask,
    updateGroceryStatus, addGroceryItem, deleteGroceryItem,
    toggleBillPaid, markRoutineDone,
    addCategory, deleteCategory, addBill, deleteBill, addRoutine, deleteRoutine]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
