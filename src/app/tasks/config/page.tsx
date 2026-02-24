"use client";

import { useState } from "react";
import { useData } from "@/context/DataContext";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const EMOJI_OPTIONS = ["😀", "😎", "🤠", "👨", "👩", "🧑", "👶", "🏠", "⭐", "🌟", "💪", "🎯"];

export default function ConfigPage() {
  const { userName, user, categories, addCategory, deleteCategory } = useData();
  const router = useRouter();
  const [userEmoji, setUserEmoji] = useState("😀");
  const [newCatName, setNewCatName] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("📌");
  const [newCatColor, setNewCatColor] = useState("#6366F1");
  const [showAddCat, setShowAddCat] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    await addCategory({ name: newCatName.trim(), emoji: newCatEmoji, color: newCatColor });
    setNewCatName("");
    setNewCatEmoji("📌");
    setShowAddCat(false);
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold">⚙️ Configuración</h1>
      </div>

      <div className="mx-4 bg-slate-800/60 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="text-4xl">{userEmoji}</span>
            <div className="flex gap-1 mt-2 flex-wrap">
              {EMOJI_OPTIONS.slice(0, 6).map(e => (
                <button
                  key={e}
                  onClick={() => setUserEmoji(e)}
                  className={`text-lg p-1 rounded ${userEmoji === e ? "bg-slate-700" : ""}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold">{userName}</h2>
            <p className="text-sm text-slate-500">{user?.email || ""}</p>
          </div>
        </div>
      </div>

      <div className="mx-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Categorías</h2>
          <button onClick={() => setShowAddCat(!showAddCat)} className="text-blue-400 text-sm font-medium">
            {showAddCat ? "Cancelar" : "+ Agregar"}
          </button>
        </div>

        {showAddCat && (
          <div className="bg-slate-800/60 rounded-xl p-4 mb-3 space-y-3">
            <input
              type="text"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="Nombre de categoría"
              className="w-full px-3 py-2 bg-slate-700 rounded-lg border border-slate-600 text-white text-sm focus:outline-none focus:border-blue-500"
            />
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={newCatEmoji}
                onChange={e => setNewCatEmoji(e.target.value)}
                className="w-16 px-3 py-2 bg-slate-700 rounded-lg border border-slate-600 text-white text-center text-sm"
                maxLength={4}
              />
              <input
                type="color"
                value={newCatColor}
                onChange={e => setNewCatColor(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border-0"
              />
              <button onClick={handleAddCategory} className="flex-1 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg">
                Agregar
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {categories.map(cat => (
            <div key={cat.id} className="bg-slate-800/40 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: cat.color + "20" }}>
                  {cat.emoji}
                </span>
                <span className="text-sm font-medium">{cat.name}</span>
              </div>
              {cat.user_id && (
                <button onClick={() => deleteCategory(cat.id)} className="text-slate-600 hover:text-red-400 text-sm p-1">✕</button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mx-4 mb-6 space-y-2">
        <h2 className="text-lg font-semibold mb-3">Módulos</h2>
        <a href="/tasks/cuentas" className="block bg-slate-800/60 rounded-xl p-4 hover:bg-slate-800/80 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💰</span>
            <div><p className="text-sm font-medium">Cuentas y Pagos</p><p className="text-xs text-slate-500">Administra cuentas recurrentes</p></div>
            <span className="ml-auto text-slate-600">→</span>
          </div>
        </a>
        <a href="/tasks/rutinas" className="block bg-slate-800/60 rounded-xl p-4 hover:bg-slate-800/80 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧹</span>
            <div><p className="text-sm font-medium">Rutinas de Aseo</p><p className="text-xs text-slate-500">Administra rutinas de limpieza y mantención</p></div>
            <span className="ml-auto text-slate-600">→</span>
          </div>
        </a>
        <a href="/tasks/resumen" className="block bg-slate-800/60 rounded-xl p-4 hover:bg-slate-800/80 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div><p className="text-sm font-medium">Resumen y Hechas</p><p className="text-xs text-slate-500">Ver estadísticas y tareas completadas</p></div>
            <span className="ml-auto text-slate-600">→</span>
          </div>
        </a>
        <a href="/tasks/completed" className="block bg-slate-800/60 rounded-xl p-4 hover:bg-slate-800/80 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div><p className="text-sm font-medium">Tareas Completadas</p><p className="text-xs text-slate-500">Historial de tareas hechas</p></div>
            <span className="ml-auto text-slate-600">→</span>
          </div>
        </a>
      </div>

      <div className="mx-4 mb-8">
        <button onClick={handleSignOut} className="w-full py-3 bg-red-500/10 text-red-400 font-medium rounded-xl hover:bg-red-500/20 transition-colors">
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
