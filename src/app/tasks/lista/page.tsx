"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useData } from "@/context/DataContext";
import { GroceryItem, GROCERY_CATEGORIES } from "@/types";

function getCategoryInfo(cat: string) {
  return GROCERY_CATEGORIES.find(c => c.id === cat || c.name === cat) || { id: "otros", name: cat || "Otros", emoji: "📦", color: "#94A3B8" };
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
  const [newCategory, setNewCategory] = useState("despensa");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
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
    setShowCategoryPicker(false);
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

  const addItem = async () => {
    if (!newName.trim()) return;
    await addGroceryItem({
      name: newName.trim(),
      category: newCategory,
    });
    setToast(`"${newName.trim()}" agregado`);
    setNewName("");
    setNewCategory("despensa");
    setShowCategoryPicker(false);
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
    setToast("Eliminado");
  };

  const selectedCatInfo = getCategoryInfo(newCategory);

  const renderItem = (item: GroceryItem, isStocked: boolean) => {
    const catInfo = getCategoryInfo(item.category);
    const isExiting = animatingOut.has(item.id);

    return (
      <div key={item.id} className="relative">
        <div
          className={`flex items-center gap-3 px-3 py-3.5 rounded-2xl cursor-pointer active:scale-[0.97] transition-all duration-300 select-none ${
            isExiting
              ? "opacity-0 translate-x-8 scale-95"
              : "opacity-100 translate-x-0 scale-100"
          } ${
            isStocked
              ? "bg-slate-800/20"
              : "bg-slate-800/50"
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
          <span className="text-lg w-7 text-center">{catInfo.emoji}</span>
          <span className={`flex-1 text-[15px] ${isStocked ? "text-slate-500" : "text-slate-100"}`}>
            {item.name}
          </span>
          <span className={`text-lg transition-transform ${isExiting ? "scale-125" : ""}`}>
            {isStocked ? "❌" : "✅"}
          </span>
        </div>

        {longPressId === item.id && (
          <div className="absolute inset-0 bg-red-900/90 rounded-2xl flex items-center justify-center gap-4 z-10 animate-in fade-in duration-150">
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

      {/* Add item: search + category picker */}
      <div className="px-4 py-3">
        <div className="relative">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={e => { setNewName(e.target.value); setShowSuggestions(true); setShowCategoryPicker(false); }}
              onFocus={() => { if (newName.trim()) setShowSuggestions(true); }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onKeyDown={e => {
                if (e.key === "Enter" && suggestions.length === 0 && newName.trim()) {
                  setShowCategoryPicker(true);
                  setShowSuggestions(false);
                } else if (e.key === "Enter" && suggestions.length > 0) {
                  handleSelectSuggestion(suggestions[0]);
                } else if (e.key === "Escape") {
                  setShowSuggestions(false);
                  setShowCategoryPicker(false);
                }
              }}
              placeholder="Agregar o buscar..."
              className="flex-1 bg-slate-800/60 border border-slate-700 rounded-2xl px-4 py-3 text-[15px] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Suggestions */}
          {showSuggestions && newName.trim() && !showCategoryPicker && (
            <div
              className="absolute left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-xl z-40"
              onMouseDown={e => e.preventDefault()}
            >
              {suggestions.map(item => {
                const catInfo = getCategoryInfo(item.category);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/60 transition-colors text-left"
                  >
                    <span>{catInfo.emoji}</span>
                    <span className="flex-1 text-[15px] text-slate-100">{item.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      item.status === "stocked"
                        ? "bg-green-900/40 text-green-400"
                        : "bg-red-900/40 text-red-400"
                    }`}>
                      {item.status === "stocked" ? "Tenemos" : "Falta"}
                    </span>
                  </button>
                );
              })}
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={() => { setShowCategoryPicker(true); setShowSuggestions(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/60 transition-colors text-left border-t border-slate-700/50"
              >
                <span>➕</span>
                <span className="text-[15px] text-blue-400">Agregar &ldquo;{newName.trim()}&rdquo;</span>
              </button>
            </div>
          )}
        </div>

        {/* Category picker (inline, appears when adding new) */}
        {showCategoryPicker && newName.trim() && (
          <div className="mt-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-wrap gap-2">
              {GROCERY_CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setNewCategory(c.id)}
                  className={`px-3 py-2 rounded-xl text-sm transition-all ${
                    newCategory === c.id
                      ? "ring-2 ring-blue-500 bg-slate-700 scale-105"
                      : "bg-slate-800/60 text-slate-400 hover:bg-slate-700/60"
                  }`}
                >
                  {c.emoji}
                </button>
              ))}
            </div>
            <button
              onClick={addItem}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-2xl py-3 text-[15px] font-medium transition-colors"
            >
              {selectedCatInfo.emoji} Agregar &ldquo;{newName.trim()}&rdquo;
            </button>
          </div>
        )}
      </div>

      {/* ❌ FALTA */}
      <div className="px-4 pb-2">
        <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3 px-1">
          ❌ Falta {faltaItems.length > 0 && `(${faltaItems.length})`}
        </h2>
        {faltaGrouped.length === 0 ? (
          <div className="text-center py-12 text-slate-600">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-sm font-medium text-slate-400">¡No falta nada!</p>
          </div>
        ) : (
          <div className="space-y-5">
            {faltaGrouped.map(([catId, items]) => {
              const catInfo = getCategoryInfo(catId);
              return (
                <div key={catId}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5" style={{ color: catInfo.color }}>
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

      {/* ✅ TENEMOS */}
      <div className="px-4 pt-6 pb-8">
        <button
          onClick={() => setTenemosOpen(!tenemosOpen)}
          className="flex items-center gap-2 text-sm font-semibold text-green-500 uppercase tracking-wider mb-3 px-1 w-full"
        >
          <span className={`transition-transform duration-200 ${tenemosOpen ? "rotate-90" : ""}`}>▶</span>
          ✅ Tenemos ({tenemosItems.length})
        </button>
        {tenemosOpen && (
          <div className="space-y-5">
            {tenemosGrouped.map(([catId, items]) => {
              const catInfo = getCategoryInfo(catId);
              return (
                <div key={catId}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5" style={{ color: catInfo.color }}>
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
