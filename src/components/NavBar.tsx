"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

export default function NavBar() {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (!user) return null;

  return (
    <nav className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
      <span className="text-sm text-slate-300">
        {user.email}
      </span>
      <button
        onClick={handleLogout}
        className="text-sm text-slate-400 hover:text-white transition-colors"
      >
        Cerrar sesión
      </button>
    </nav>
  );
}
