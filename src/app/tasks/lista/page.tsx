"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useData } from "@/context/DataContext";
import { GroceryItem, GROCERY_CATEGORIES } from "@/types";

function getCategoryInfo(cat: string) {
  return GROCERY_CATEGORIES.find(c => c.id === cat || c.name === cat) || { id: "otros", name: cat || "Otros", emoji: "📦", color: "#94A3B8" };
}

function getFrequencyDot(item: GroceryItem): string | null {
  if (!item.frequency_days) return null;
  if (item.frequency_days <= 7) return "🔴";
  if (item.frequency_days <= 14) return "🟡";
  return "🟢";
}

function shouldShowFrequencyHint(item: GroceryItem): boolean {
  if (!item.last_stocked_at || !item.frequency_days || item.status !== "stocked") return false;
  const elapsed = (Date.now() - new Date(item.last_stocked_at).getTime()) / (1000 * 60 * 60 * 24);
  return elapsed > item.frequency_days * 0.8;
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function groupByCategory(items: GroceryItem[]): [string, GroceryItem[]][] {
  const order = GROCERY_CATEGORIES.map(c => c.id);
  const grouped: Record<string, GroceryItem[]> = {};
  for (const item of items) {
    const catInfo = getCategoryInfo(item.category);
    const key = catInfo.id;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }
  return Object.entries(grouped).sort((a, b) => {
    const ai = order.indexOf(a[0]);
    const bi = order.indexOf(b[0]);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

export default function ListaPage() {
  const { groceryItems, updateGroceryStatus, addGroceryItem, deleteGroceryItem } = useData();
  const [newName, setNewName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState("despensa");
  const [newBrand, setNewBrand] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [newFrequency, setNewFrequency] = useState("");
  const [tenemosOpen, setTenemosOpen] = useState(false);
  const [animatingOut, setAnimatingOut] = useState<Set<string>>(new Set());
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [longPressId, setLongPressId] = useState<string | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    const q = newName.trim();
    if (!q) return [];
    const nq = normalize(q);
    return groceryItems
      .filter(item => normalize(item.name).includes(nq))
      .slice(0, 6);
  }, [newName, groceryItems]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const handleSelectSuggestion = useCallback(async (item: GroceryItem) => {
    if (item.status === "stocked") {
      await updateGroceryStatus(item.id, "needed");
      setToast(`"${item.name}" → Falta`);
    } else {
      setToast(`"${item.name}" ya está en Falta`);
    }
    setNewName("");
    setShowSuggestions(false);
    setShowAddForm(false);
  }, [updateGroceryStatus]);

  const faltaItems = useMemo(() => groceryItems.filter(i => i.status === "needed"), [groceryItems]);
  const tenemosItems = useMemo(() => groceryItems.filter(i => i.status === "stocked"), [groceryItems]);
  const faltaGrouped = useMemo(() => groupByCategory(faltaItems), [faltaItems]);
  const tenemosGrouped = useMemo(() => groupByCategory(tenemosItems), [tenemosItems]);

  const toggleStatus = useCallback(async (item: GroceryItem) => {
    const newStatus = item.status === "needed" ? "stocked" : "needed";
    setAnimatingOut(prev => new Set(prev).add(item.id));
    setTimeout(async () => {
      await updateGroceryStatus(item.id, newStatus);
      setAnimatingOut(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }, 300);
  }, [updateGroceryStatus]);

  const openAddForm = () => {
    setShowAddForm(true);
    setShowSuggestions(false);
  };

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
    setToast(`"${newName.trim()}" agregado a Falta`);
    setNewName("");
    setNewBrand("");
    setNewQuantity("");
    setNewFrequency("");
    setNewCategory("despensa");
    setShowAddForm(false);
  };

  const handleLongPressStart = (id: string) => {
    longPressTimer.current = setTimeout(() => {
      setLongPressId(id);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const confirmDelete = async (id: string) => {
    await deleteGroceryItem(id);
    setLongPressId(null);
    setToast("Item eliminado");
  };

  const renderItem = (item: GroceryItem, isStocked: boolean) => {
    const catInfo = getCategoryInfo(item.category);
    const isExiting = animatingOut.has(item.id);
    const showHint = shouldShowFrequencyHint(item);
    const freqDot = getFrequencyDot(item);

    return (
      <div key={item.id} className="relative">
        <div
          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer active:scale-[0.97] transition-all duration-300 select-none ${
            isExiting
              ? "opacity-0 translate-x-8 scale-95"
              : "opacity-100 translate-x-0 scale-100"
          } ${
            isStocked
              ? "bg-slate-800/30 hover:bg-slate-800/50"
              : "bg-slate-800/60 hover:bg-slate-700/60"
          }`}
          onClick={() => {
            if (longPressId === item.id) return;
            toggleStatus(item);
          }}
          onTouchStart={() => handleLongPressStart(item.id)}
          onTouchEnd={handleLongPressEnd}
          onTouchCancel={handleLongPressEnd}
          onContextMenu={(e) => {
            e.preventDefault();
            setLongPressId(item.id);
          }}
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
              {item.typical_qty && (
                <span className="text-[10px] bg-slate-700/60 text-slate-400 px-1.5 py-0.5 rounded-md">{item.typical_qty}</span>
              )}
              {item.quantity && !item.typical_qty && (
                <span className="text-[10px] bg-slate-700/60 text-slate-400 px-1.5 py-0.5 rounded-md">{item.quantity}</span>
              )}
              {freqDot && <span className="text-[10px]">{freqDot}</span>}
              {showHint && <span className="text-xs" title="Probablemente por acabarse">⚡</span>}
            </div>
          </div>
          <span className={`text-lg transition-transform ${isExiting ? "scale-125" : ""}`}>
            {isStocked ? "❌" : "✅"}
          </span>
        </div>

        {/* Delete confirmation overlay */}
        {longPressId === item.id && (
          <div className="absolute inset-0 bg-red-900/90 rounded-xl flex items-center justify-center gap-4 z-10 animate-in fade-in duration-150">
            <button
              onClick={() => confirmDelete(item.id)}
              className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              🗑 Eliminar
            </button>
            <button
              onClick={() => setLongPressId(null)}
              className="bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Cancelar
            </button>
          </div>
        )}
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

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-700 text-slate-100 px-4 py-2 rounded-xl text-sm shadow-lg animate-pulse">
          {toast}
        </div>
      )}

      {/* Search Bar */}
      <div className="px-4 py-3">
        <div className="relative">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={e => { setNewName(e.target.value); setShowSuggestions(true); setShowAddForm(false); }}
              onFocus={() => { if (newName.trim()) setShowSuggestions(true); }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onKeyDown={e => {
                if (e.key === "Enter" && suggestions.length === 0 && newName.trim()) {
                  openAddForm();
                } else if (e.key === "Enter" && suggestions.length > 0) {
                  handleSelectSuggestion(suggestions[0]);
                } else if (e.key === "Escape") {
                  setShowSuggestions(false);
                  setShowAddForm(false);
                }
              }}
              placeholder="Buscar o agregar item..."
              className="flex-1 bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && newName.trim() && !showAddForm && (
            <div
              className="absolute left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl z-40"
              onMouseDown={e => e.preventDefault()}
            >
              {suggestions.map(item => {
                const catInfo = getCategoryInfo(item.category);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-700/60 transition-colors text-left"
                  >
                    <span className="text-sm">{catInfo.emoji}</span>
                    <span className="text-sm text-slate-100 truncate">{item.name}</span>
                    {item.brand && <span className="text-xs text-slate-500 truncate">{item.brand}</span>}
                    <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-md whitespace-nowrap ${
                      item.status === "stocked"
                        ? "bg-green-900/40 text-green-400"
                        : "bg-red-900/40 text-red-400"
                    }`}>
                      {item.status === "stocked" ? "✅ Tenemos" : "❌ Falta"}
                    </span>
                  </button>
                );
              })}
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={openAddForm}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-700/60 transition-colors text-left border-t border-slate-700/50"
              >
                <span className="text-sm">➕</span>
                <span className="text-sm text-blue-400">Agregar &ldquo;{newName.trim()}&rdquo; como nuevo</span>
              </button>
            </div>
          )}
        </div>

        {/* Add New Item Form */}
        {showAddForm && newName.trim() && (
          <div className="mt-3 bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">Nuevo: {newName.trim()}</h3>
              <button onClick={() => setShowAddForm(false)} className="text-slate-500 hover:text-slate-300 text-sm">✕</button>
            </div>

            {/* Category - Emoji Buttons */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Categoría *</label>
              <div className="flex flex-wrap gap-1.5">
                {GROCERY_CATEGORIES.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setNewCategory(c.id)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                      newCategory === c.id
                        ? "ring-2 ring-blue-500 bg-slate-700 text-white scale-105"
                        : "bg-slate-800/60 text-slate-400 hover:bg-slate-700/60"
                    }`}
                  >
                    <span>{c.emoji}</span>
                    <span className="hidden sm:inline">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Brand + Quantity row */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-slate-400 mb-1 block">Marca</label>
                <input
                  type="text"
                  value={newBrand}
                  onChange={e => setNewBrand(e.target.value)}
                  placeholder="Colun, Lider..."
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="w-24">
                <label className="text-xs text-slate-400 mb-1 block">Cantidad</label>
                <input
                  type="text"
                  value={newQuantity}
                  onChange={e => setNewQuantity(e.target.value)}
                  placeholder="x2, 1kg"
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Frequency */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Frecuencia</label>
              <div className="flex gap-2">
                {[
                  { value: "", label: "—", dot: "" },
                  { value: "7", label: "Semanal", dot: "🔴" },
                  { value: "14", label: "Quincenal", dot: "🟡" },
                  { value: "30", label: "Mensual", dot: "🟢" },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setNewFrequency(opt.value)}
                    className={`flex-1 py-1.5 rounded-lg text-xs transition-all ${
                      newFrequency === opt.value
                        ? "ring-2 ring-blue-500 bg-slate-700 text-white"
                        : "bg-slate-800/60 text-slate-400 hover:bg-slate-700/60"
                    }`}
                  >
                    {opt.dot} {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={addItem}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
            >
              ➕ Agregar a Falta
            </button>
          </div>
        )}
      </div>

      {/* ❌ FALTA section */}
      <div className="px-4 pb-2">
        <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3 px-1">
          ❌ Falta {faltaItems.length > 0 && `(${faltaItems.length})`}
        </h2>
        {faltaGrouped.length === 0 ? (
          <div className="text-center py-10 text-slate-600">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-sm font-medium text-slate-400">¡No falta nada!</p>
            <p className="text-xs text-slate-600 mt-1">Busca arriba para agregar items</p>
          </div>
        ) : (
          <div className="space-y-4">
            {faltaGrouped.map(([catId, items]) => {
              const catInfo = getCategoryInfo(catId);
              return (
                <div key={catId}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-1.5 px-1 flex items-center gap-1.5" style={{ color: catInfo.color }}>
                    {catInfo.emoji} {catInfo.name}
                    <span className="text-slate-600 font-normal">({items.length})</span>
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
            {tenemosGrouped.map(([catId, items]) => {
              const catInfo = getCategoryInfo(catId);
              return (
                <div key={catId}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-1.5 px-1 flex items-center gap-1.5" style={{ color: catInfo.color }}>
                    {catInfo.emoji} {catInfo.name}
                    <span className="text-slate-600 font-normal">({items.length})</span>
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
