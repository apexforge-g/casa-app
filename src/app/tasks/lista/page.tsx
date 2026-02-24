"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { GroceryItem, GROCERY_CATEGORIES } from "@/types";

const STATUS_CYCLE: GroceryItem["status"][] = ["stocked", "low", "needed", "in_cart"];
const SHOPPING_CYCLE: GroceryItem["status"][] = ["needed", "in_cart", "stocked"];

const STATUS_CONFIG = {
  stocked: { label: "Tenemos", emoji: "✅", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  low: { label: "Por acabarse", emoji: "⚠️", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  needed: { label: "Falta", emoji: "❌", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  in_cart: { label: "En el carro", emoji: "🛒", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

function getCategoryInfo(name: string) {
  return GROCERY_CATEGORIES.find((c) => c.name === name) || { name, emoji: "📦", color: "#94A3B8" };
}

export default function ListaPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [shoppingMode, setShoppingMode] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Otros");
  const [newQuantity, setNewQuantity] = useState("");

  const loadItems = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setUserId(user.id);

    const { data } = await supabase
      .from("grocery_items")
      .select("*")
      .order("category")
      .order("name");
    setItems(data || []);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { loadItems(); }, [loadItems]);

  // Task integration: sync grocery task
  const syncGroceryTask = useCallback(async (updatedItems: GroceryItem[]) => {
    const neededCount = updatedItems.filter((i) => i.status === "needed" || i.status === "in_cart").length;

    // Find the "Compras" category
    const { data: categories } = await supabase.from("categories").select("id").eq("name", "Compras").limit(1);
    const comprasCatId = categories?.[0]?.id || null;

    // Find existing grocery task
    const { data: existingTasks } = await supabase
      .from("tasks")
      .select("id, status")
      .eq("title", "🛒 Ir al supermercado")
      .eq("status", "pending")
      .limit(1);

    if (neededCount > 0 && (!existingTasks || existingTasks.length === 0)) {
      // Create task
      await supabase.from("tasks").insert({
        title: "🛒 Ir al supermercado",
        category_id: comprasCatId,
        assigned_to: "both",
        priority: "media",
        status: "pending",
        created_by: userId,
      });
    } else if (neededCount === 0 && existingTasks && existingTasks.length > 0) {
      // Auto-complete
      await supabase.from("tasks").update({
        status: "completed",
        completed_by: userId,
        completed_at: new Date().toISOString(),
      }).eq("id", existingTasks[0].id);
    }
  }, [supabase, userId]);

  const cycleStatus = async (item: GroceryItem) => {
    const cycle = shoppingMode ? SHOPPING_CYCLE : STATUS_CYCLE;
    const currentIdx = cycle.indexOf(item.status);
    const nextStatus = cycle[(currentIdx + 1) % cycle.length];

    await supabase.from("grocery_items").update({ status: nextStatus }).eq("id", item.id);
    const updated = items.map((i) => i.id === item.id ? { ...i, status: nextStatus } : i);
    setItems(updated);
    syncGroceryTask(updated);
  };

  const addItem = async () => {
    if (!newName.trim()) return;
    const { data } = await supabase
      .from("grocery_items")
      .insert({
        name: newName.trim(),
        category: newCategory,
        status: "needed" as const,
        quantity: newQuantity.trim() || null,
        created_by: userId,
      })
      .select("*")
      .single();
    if (data) {
      const updated = [...items, data];
      setItems(updated);
      setNewName("");
      setNewQuantity("");
      syncGroceryTask(updated);
    }
  };

  const deleteItem = async (id: string) => {
    await supabase.from("grocery_items").delete().eq("id", id);
    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    syncGroceryTask(updated);
  };

  // Filter items
  const displayItems = shoppingMode
    ? items.filter((i) => i.status === "needed" || i.status === "in_cart")
    : items;

  // Group by category
  const grouped = displayItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, GroceryItem[]>);

  // Separate stocked items for non-shopping mode
  const stockedItems = !shoppingMode ? items.filter((i) => i.status === "stocked") : [];
  const activeItems = !shoppingMode
    ? Object.entries(grouped).map(([cat, catItems]) => [cat, catItems.filter((i) => i.status !== "stocked")] as [string, GroceryItem[]]).filter(([, items]) => items.length > 0)
    : Object.entries(grouped);

  const neededCount = items.filter((i) => i.status === "needed").length;
  const inCartCount = items.filter((i) => i.status === "in_cart").length;

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🛒 Lista de Compras</h1>
            <p className="text-sm text-slate-500 mt-1">
              {neededCount > 0 && <span className="text-red-400">{neededCount} faltan</span>}
              {neededCount > 0 && inCartCount > 0 && " · "}
              {inCartCount > 0 && <span className="text-blue-400">{inCartCount} en el carro</span>}
              {neededCount === 0 && inCartCount === 0 && "Todo en stock ✨"}
            </p>
          </div>
          <button
            onClick={() => setShoppingMode(!shoppingMode)}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
              shoppingMode
                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {shoppingMode ? "🛒 Comprando" : "🛒 Modo Compras"}
          </button>
        </div>
      </div>

      {/* Quick add */}
      <div className="px-4 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder="Agregar item..."
            className="flex-1 bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            placeholder="Cant."
            className="w-16 bg-slate-800/60 border border-slate-700 rounded-xl px-2 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="bg-slate-800/60 border border-slate-700 rounded-xl px-2 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
          >
            {GROCERY_CATEGORIES.map((c) => (
              <option key={c.name} value={c.name}>{c.emoji} {c.name}</option>
            ))}
          </select>
          <button
            onClick={addItem}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Items grouped by category */}
      <div className="px-4 space-y-4 pb-4">
        {(shoppingMode ? Object.entries(grouped) : activeItems).map(([cat, catItems]) => {
          const catInfo = getCategoryInfo(cat);
          return (
            <div key={cat}>
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: catInfo.color }}>
                {catInfo.emoji} {catInfo.name}
              </h2>
              <div className="space-y-1.5">
                {(catItems as GroceryItem[]).map((item) => {
                  const status = STATUS_CONFIG[item.status];
                  return (
                    <div
                      key={item.id}
                      className="group bg-slate-800/60 rounded-xl p-3 flex items-center gap-3 active:scale-[0.98] transition-all cursor-pointer"
                      onClick={() => cycleStatus(item)}
                    >
                      <span className="text-lg">{status.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium text-sm ${item.status === "stocked" ? "text-slate-500" : "text-slate-100"}`}>
                            {item.name}
                          </span>
                          {item.quantity && (
                            <span className="text-xs text-slate-500">{item.quantity}</span>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${status.color}`}>
                        {status.label}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all text-sm p-1"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {displayItems.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <p className="text-4xl mb-3">{shoppingMode ? "✨" : "🛒"}</p>
            <p className="text-lg font-medium">
              {shoppingMode ? "¡Nada que comprar!" : "Lista vacía"}
            </p>
            <p className="text-sm mt-1">
              {shoppingMode ? "Todo está en stock" : "Agrega items arriba"}
            </p>
          </div>
        )}

        {/* Stocked section (non-shopping mode) */}
        {!shoppingMode && stockedItems.length > 0 && (
          <details className="mt-6">
            <summary className="text-xs font-semibold text-green-500 uppercase tracking-wider cursor-pointer px-1 mb-2">
              ✅ Tenemos todo ({stockedItems.length})
            </summary>
            <div className="space-y-1.5 mt-2">
              {stockedItems.map((item) => {
                const catInfo = getCategoryInfo(item.category);
                return (
                  <div
                    key={item.id}
                    className="group bg-slate-800/30 rounded-xl p-3 flex items-center gap-3 active:scale-[0.98] transition-all cursor-pointer opacity-60"
                    onClick={() => cycleStatus(item)}
                  >
                    <span className="text-lg">✅</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-slate-500">{item.name}</span>
                        {item.quantity && <span className="text-xs text-slate-600">{item.quantity}</span>}
                        <span className="text-xs text-slate-600">{catInfo.emoji}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all text-sm p-1"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
