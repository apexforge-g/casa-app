"use client";

import { useState, useMemo } from "react";
import { useData } from "@/context/DataContext";
import { GroceryItem, GROCERY_CATEGORIES } from "@/types";

const STATUS_CYCLE: GroceryItem["status"][] = ["stocked", "low", "needed", "in_cart"];
const SHOPPING_CYCLE: GroceryItem["status"][] = ["needed", "in_cart", "stocked"];

const STATUS_CONFIG = {
  stocked: { label: "Tenemos", emoji: "✅", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  low: { label: "Por acabarse", emoji: "⚠️", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  needed: { label: "Falta", emoji: "❌", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  in_cart: { label: "En el carro", emoji: "🛒", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

function getCategoryInfo(cat: string) {
  return GROCERY_CATEGORIES.find(c => c.name === cat || c.id === cat) || { id: "otros", name: cat, emoji: "📦", color: "#94A3B8" };
}

function getFrequencyBadge(days: number | null) {
  if (!days) return null;
  if (days <= 7) return { label: "Semanal", emoji: "🔴", cls: "text-red-400" };
  if (days <= 14) return { label: "Quincenal", emoji: "🟡", cls: "text-yellow-400" };
  return { label: "Mensual", emoji: "🟢", cls: "text-green-400" };
}

function shouldSuggestLow(item: GroceryItem): boolean {
  if (!item.last_stocked_at || !item.frequency_days || item.status !== "stocked") return false;
  const elapsed = (Date.now() - new Date(item.last_stocked_at).getTime()) / (1000 * 60 * 60 * 24);
  return elapsed > item.frequency_days * 0.8;
}

export default function ListaPage() {
  const { groceryItems, updateGroceryStatus, addGroceryItem, deleteGroceryItem } = useData();
  const [shoppingMode, setShoppingMode] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Lácteos");
  const [newQuantity, setNewQuantity] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newTypicalQty, setNewTypicalQty] = useState("");
  const [newFrequency, setNewFrequency] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const suggestedLowItems = useMemo(() => groceryItems.filter(shouldSuggestLow), [groceryItems]);

  const cycleStatus = async (item: GroceryItem) => {
    const cycle = shoppingMode ? SHOPPING_CYCLE : STATUS_CYCLE;
    const currentIdx = cycle.indexOf(item.status);
    const nextStatus = cycle[(currentIdx + 1) % cycle.length];
    await updateGroceryStatus(item.id, nextStatus);
  };

  const addItem = async () => {
    if (!newName.trim()) return;
    const freqMap: Record<string, number> = { "7": 7, "14": 14, "30": 30 };
    const freq = newFrequency ? (freqMap[newFrequency] || parseInt(newFrequency) || null) : null;
    await addGroceryItem({
      name: newName.trim(),
      category: newCategory,
      quantity: newQuantity.trim() || null,
      typical_qty: newTypicalQty.trim() || null,
      brand: newBrand.trim() || null,
      frequency_days: freq,
    });
    setNewName("");
    setNewQuantity("");
    setNewBrand("");
    setNewTypicalQty("");
    setNewFrequency("");
  };

  const displayItems = shoppingMode
    ? groceryItems.filter(i => i.status === "needed" || i.status === "in_cart")
    : groceryItems;

  const grouped = displayItems.reduce((acc, item) => {
    const catInfo = getCategoryInfo(item.category);
    const key = catInfo.name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, GroceryItem[]>);

  const stockedItems = !shoppingMode ? groceryItems.filter(i => i.status === "stocked") : [];
  const activeItems = !shoppingMode
    ? Object.entries(grouped).map(([cat, catItems]) => [cat, catItems.filter(i => i.status !== "stocked")] as [string, GroceryItem[]]).filter(([, items]) => items.length > 0)
    : Object.entries(grouped);

  const neededCount = groceryItems.filter(i => i.status === "needed").length;
  const inCartCount = groceryItems.filter(i => i.status === "in_cart").length;

  const renderItemLabel = (item: GroceryItem) => {
    const parts = [item.name];
    if (item.brand) parts[0] = `${item.name} ${item.brand}`;
    return parts[0];
  };

  return (
    <div className="max-w-lg mx-auto">
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

      {/* Smart suggestions */}
      {!shoppingMode && suggestedLowItems.length > 0 && (
        <div className="px-4 py-2">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
            <p className="text-xs font-semibold text-yellow-400 mb-2">⚡ Probablemente por acabarse:</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestedLowItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => updateGroceryStatus(item.id, "low")}
                  className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-lg hover:bg-yellow-500/30 transition-colors"
                >
                  {item.name} → ⚠️
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add item form */}
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
          <select
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            className="bg-slate-800/60 border border-slate-700 rounded-xl px-2 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
          >
            {GROCERY_CATEGORIES.map(c => (
              <option key={c.id} value={c.name}>{c.emoji} {c.name}</option>
            ))}
          </select>
          <button
            onClick={addItem}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
          >
            +
          </button>
        </div>

        {/* Toggle advanced fields */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-slate-500 mt-2 hover:text-slate-300 transition-colors"
        >
          {showAdvanced ? "▲ Menos opciones" : "▼ Más opciones (marca, cantidad, frecuencia)"}
        </button>

        {showAdvanced && (
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={newBrand}
              onChange={e => setNewBrand(e.target.value)}
              placeholder="Marca"
              className="flex-1 bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              value={newTypicalQty}
              onChange={e => setNewTypicalQty(e.target.value)}
              placeholder="Cant. (x2, 1kg)"
              className="w-24 bg-slate-800/60 border border-slate-700 rounded-xl px-2 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
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

      {/* Items list */}
      <div className="px-4 space-y-4 pb-4">
        {(shoppingMode ? Object.entries(grouped) : activeItems).map(([cat, catItems]) => {
          const catInfo = getCategoryInfo(cat);
          return (
            <div key={cat}>
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: catInfo.color }}>
                {catInfo.emoji} {catInfo.name}
              </h2>
              <div className="space-y-1.5">
                {(catItems as GroceryItem[]).map(item => {
                  const status = STATUS_CONFIG[item.status];
                  const freqBadge = getFrequencyBadge(item.frequency_days);
                  const isSuggested = shouldSuggestLow(item);
                  return (
                    <div
                      key={item.id}
                      className={`group bg-slate-800/60 rounded-xl p-3 flex items-center gap-3 active:scale-[0.98] transition-all cursor-pointer ${isSuggested ? "ring-1 ring-yellow-500/30" : ""}`}
                      onClick={() => cycleStatus(item)}
                    >
                      <span className="text-lg">{status.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium text-sm ${item.status === "stocked" ? "text-slate-500" : "text-slate-100"}`}>
                            {renderItemLabel(item)}
                          </span>
                          {item.typical_qty && <span className="text-xs text-slate-400">— {item.typical_qty}</span>}
                          {item.quantity && !item.typical_qty && <span className="text-xs text-slate-500">{item.quantity}</span>}
                        </div>
                        {freqBadge && (
                          <span className={`text-[10px] ${freqBadge.cls}`}>
                            {freqBadge.emoji} {freqBadge.label}
                          </span>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${status.color}`}>
                        {status.label}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); deleteGroceryItem(item.id); }}
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
            <p className="text-lg font-medium">{shoppingMode ? "¡Nada que comprar!" : "Lista vacía"}</p>
            <p className="text-sm mt-1">{shoppingMode ? "Todo está en stock" : "Agrega items arriba"}</p>
          </div>
        )}

        {!shoppingMode && stockedItems.length > 0 && (
          <details className="mt-6">
            <summary className="text-xs font-semibold text-green-500 uppercase tracking-wider cursor-pointer px-1 mb-2">
              ✅ Tenemos todo ({stockedItems.length})
            </summary>
            <div className="space-y-1.5 mt-2">
              {stockedItems.map(item => {
                const catInfo = getCategoryInfo(item.category);
                const freqBadge = getFrequencyBadge(item.frequency_days);
                const isSuggested = shouldSuggestLow(item);
                return (
                  <div
                    key={item.id}
                    className={`group bg-slate-800/30 rounded-xl p-3 flex items-center gap-3 active:scale-[0.98] transition-all cursor-pointer opacity-60 ${isSuggested ? "ring-1 ring-yellow-500/40 opacity-80" : ""}`}
                    onClick={() => cycleStatus(item)}
                  >
                    <span className="text-lg">✅</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-slate-500">{renderItemLabel(item)}</span>
                        {item.typical_qty && <span className="text-xs text-slate-600">— {item.typical_qty}</span>}
                        <span className="text-xs text-slate-600">{catInfo.emoji}</span>
                      </div>
                      {freqBadge && (
                        <span className={`text-[10px] ${freqBadge.cls}`}>
                          {freqBadge.emoji} {freqBadge.label}
                        </span>
                      )}
                    </div>
                    {isSuggested && (
                      <span className="text-[10px] text-yellow-400 bg-yellow-500/20 px-1.5 py-0.5 rounded-full">⚡ revisar</span>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); deleteGroceryItem(item.id); }}
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
