"use client";

import { useState, useMemo, useCallback } from "react";
import { useData } from "@/context/DataContext";
import { GroceryItem, GROCERY_CATEGORIES } from "@/types";

function getCategoryInfo(cat: string) {
  return GROCERY_CATEGORIES.find(c => c.name === cat || c.id === cat) || { id: "otros", name: cat, emoji: "📦", color: "#94A3B8" };
}

function shouldShowFrequencyHint(item: GroceryItem): boolean {
  if (!item.last_stocked_at || !item.frequency_days || item.status !== "stocked") return false;
  const elapsed = (Date.now() - new Date(item.last_stocked_at).getTime()) / (1000 * 60 * 60 * 24);
  return elapsed > item.frequency_days * 0.8;
}

function groupByCategory(items: GroceryItem[]): [string, GroceryItem[]][] {
  const grouped: Record<string, GroceryItem[]> = {};
  for (const item of items) {
    const catInfo = getCategoryInfo(item.category);
    const key = catInfo.name;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }
  return Object.entries(grouped);
}

export default function ListaPage() {
  const { groceryItems, updateGroceryStatus, addGroceryItem, deleteGroceryItem } = useData();
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Lácteos");
  const [newBrand, setNewBrand] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [newFrequency, setNewFrequency] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tenemosOpen, setTenemosOpen] = useState(false);
  const [animatingOut, setAnimatingOut] = useState<Set<string>>(new Set());

  const faltaItems = useMemo(() => groceryItems.filter(i => i.status === "needed"), [groceryItems]);
  const tenemosItems = useMemo(() => groceryItems.filter(i => i.status === "stocked"), [groceryItems]);
  const faltaGrouped = useMemo(() => groupByCategory(faltaItems), [faltaItems]);
  const tenemosGrouped = useMemo(() => groupByCategory(tenemosItems), [tenemosItems]);

  const toggleStatus = useCallback(async (item: GroceryItem) => {
    const newStatus = item.status === "needed" ? "stocked" : "needed";
    setAnimatingOut(prev => new Set(prev).add(item.id));
    // Wait for animation
    setTimeout(async () => {
      await updateGroceryStatus(item.id, newStatus);
      setAnimatingOut(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }, 300);
  }, [updateGroceryStatus]);

  const addItem = async () => {
    if (!newName.trim()) return;
    const freqMap: Record<string, number> = { "7": 7, "14": 14, "30": 30 };
    const freq = newFrequency ? (freqMap[newFrequency] || parseInt(newFrequency) || null) : null;
    await addGroceryItem({
      name: newName.trim(),
      category: newCategory,
      quantity: newQuantity.trim() || null,
      brand: newBrand.trim() || null,
      frequency_days: freq,
    });
    setNewName("");
    setNewBrand("");
    setNewQuantity("");
    setNewFrequency("");
  };

  const renderItem = (item: GroceryItem, isStocked: boolean) => {
    const catInfo = getCategoryInfo(item.category);
    const isExiting = animatingOut.has(item.id);
    const showHint = shouldShowFrequencyHint(item);

    return (
      <div
        key={item.id}
        className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer active:scale-[0.97] transition-all duration-300 ${
          isExiting
            ? "opacity-0 translate-x-8 scale-95"
            : "opacity-100 translate-x-0 scale-100"
        } ${
          isStocked
            ? "bg-slate-800/30 hover:bg-slate-800/50"
            : "bg-slate-800/60 hover:bg-slate-700/60"
        }`}
        onClick={() => toggleStatus(item)}
      >
        <span className="text-base w-6 text-center">{catInfo.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium text-sm truncate ${isStocked ? "text-slate-500" : "text-slate-100"}`}>
              {item.name}
            </span>
            {item.brand && (
              <span className="text-xs text-slate-500 truncate">{item.brand}</span>
            )}
            {item.quantity && (
              <span className="text-xs text-slate-600">×{item.quantity}</span>
            )}
            {showHint && <span className="text-xs" title="Probablemente por acabarse">⚡</span>}
          </div>
        </div>
        <span className={`text-lg transition-transform ${isExiting ? "scale-125" : ""}`}>
          {isStocked ? "❌" : "✅"}
        </span>
        <button
          onClick={e => { e.stopPropagation(); deleteGroceryItem(item.id); }}
          className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all text-sm p-1"
        >
          ✕
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-bold">🛒 Lista</h1>
        <p className="text-sm text-slate-500 mt-1">
          {faltaItems.length > 0
            ? <span className="text-red-400">{faltaItems.length} cosa{faltaItems.length !== 1 ? "s" : ""} por comprar</span>
            : <span className="text-green-400">Todo listo ✨</span>
          }
        </p>
      </div>

      {/* Quick Add */}
      <div className="px-4 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addItem()}
            placeholder="Agregar item..."
            className="flex-1 bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={addItem}
            disabled={!newName.trim()}
            className="bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
          >
            +
          </button>
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-slate-500 mt-2 hover:text-slate-300 transition-colors"
        >
          {showAdvanced ? "▲ Menos" : "▼ Categoría, marca, frecuencia"}
        </button>
        {showAdvanced && (
          <div className="flex flex-wrap gap-2 mt-2">
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              className="bg-slate-800/60 border border-slate-700 rounded-xl px-2 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
            >
              {GROCERY_CATEGORIES.map(c => (
                <option key={c.id} value={c.name}>{c.emoji} {c.name}</option>
              ))}
            </select>
            <input
              type="text"
              value={newBrand}
              onChange={e => setNewBrand(e.target.value)}
              placeholder="Marca"
              className="flex-1 min-w-[80px] bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              value={newQuantity}
              onChange={e => setNewQuantity(e.target.value)}
              placeholder="Cant."
              className="w-16 bg-slate-800/60 border border-slate-700 rounded-xl px-2 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <select
              value={newFrequency}
              onChange={e => setNewFrequency(e.target.value)}
              className="bg-slate-800/60 border border-slate-700 rounded-xl px-2 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="">Frecuencia</option>
              <option value="7">🔴 Semanal</option>
              <option value="14">🟡 Quincenal</option>
              <option value="30">🟢 Mensual</option>
            </select>
          </div>
        )}
      </div>

      {/* ❌ FALTA section */}
      <div className="px-4 pb-2">
        <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3 px-1">
          ❌ Falta {faltaItems.length > 0 && `(${faltaItems.length})`}
        </h2>
        {faltaGrouped.length === 0 ? (
          <div className="text-center py-8 text-slate-600">
            <p className="text-3xl mb-2">✨</p>
            <p className="text-sm">¡No falta nada!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {faltaGrouped.map(([cat, items]) => {
              const catInfo = getCategoryInfo(cat);
              return (
                <div key={cat}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-1.5 px-1" style={{ color: catInfo.color }}>
                    {catInfo.emoji} {catInfo.name}
                  </h3>
                  <div className="space-y-1.5">
                    {items.map(item => renderItem(item, false))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ✅ TENEMOS section */}
      <div className="px-4 pt-4 pb-8">
        <button
          onClick={() => setTenemosOpen(!tenemosOpen)}
          className="flex items-center gap-2 text-sm font-semibold text-green-500 uppercase tracking-wider mb-3 px-1 w-full"
        >
          <span className={`transition-transform duration-200 ${tenemosOpen ? "rotate-90" : ""}`}>▶</span>
          ✅ Tenemos ({tenemosItems.length})
        </button>
        {tenemosOpen && (
          <div className="space-y-4">
            {tenemosGrouped.map(([cat, items]) => {
              const catInfo = getCategoryInfo(cat);
              return (
                <div key={cat}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-1.5 px-1" style={{ color: catInfo.color }}>
                    {catInfo.emoji} {catInfo.name}
                  </h3>
                  <div className="space-y-1.5">
                    {items.map(item => renderItem(item, true))}
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
