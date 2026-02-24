"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            🏠 Casa App
          </h1>
          <p className="text-xl text-slate-300">Tareas del Hogar</p>
        </div>

        <p className="text-slate-400 max-w-md mx-auto">
          Organiza las tareas de tu hogar de forma simple y eficiente.
        </p>

        <p className="text-slate-500 text-sm">
          {new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>

        <Link
          href="/tasks"
          className="inline-block px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-emerald-500 font-semibold text-white hover:from-blue-600 hover:to-emerald-600 transition-all shadow-lg shadow-blue-500/25"
        >
          Ver Tareas
        </Link>
      </div>
    </main>
  );
}
