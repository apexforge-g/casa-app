import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if already has data
  const [{ count: taskCount }, { count: billCount }, { count: routineCount }] = await Promise.all([
    supabase.from("tasks").select("id", { count: "exact", head: true }),
    supabase.from("bills").select("id", { count: "exact", head: true }),
    supabase.from("routines").select("id", { count: "exact", head: true }),
  ]);

  if ((taskCount || 0) > 0 || (billCount || 0) > 0 || (routineCount || 0) > 0) {
    return NextResponse.json({ message: "Already has data" });
  }

  // Seed bills
  await supabase.from("bills").insert([
    { name: "Arriendo + Gastos Comunes + Cuentas", amount: 710000, due_day: 5, category: "Arriendo", auto_create_task_days: 3, created_by: user.id },
    { name: "Internet", amount: 35000, due_day: 15, category: "Servicios", auto_create_task_days: 3, created_by: user.id },
  ]);

  // Seed routines
  await supabase.from("routines").insert([
    { name: "Limpiar baño", frequency_days: 7, category: "Limpieza", created_by: user.id },
    { name: "Aspirar/Barrer", frequency_days: 7, category: "Limpieza", created_by: user.id },
    { name: "Lavar sábanas", frequency_days: 14, category: "Limpieza", created_by: user.id },
    { name: "Limpiar cocina profundo", frequency_days: 14, category: "Cocina", created_by: user.id },
    { name: "Sacar basura", frequency_days: 3, category: "Limpieza", created_by: user.id },
    { name: "Revisar filtro campana", frequency_days: 30, category: "Mantención", created_by: user.id },
  ]);

  // Seed grocery items
  const groceries = [
    { name: "Leche", category: "lacteos" },
    { name: "Huevos", category: "lacteos" },
    { name: "Pan", category: "despensa" },
    { name: "Arroz", category: "despensa" },
    { name: "Fideos", category: "despensa" },
    { name: "Aceite", category: "despensa" },
    { name: "Papel higiénico", category: "higiene" },
    { name: "Jabón", category: "higiene" },
    { name: "Detergente", category: "limpieza" },
    { name: "Frutas", category: "frutas" },
    { name: "Verduras", category: "verduras" },
    { name: "Pollo", category: "carnes" },
    { name: "Carne", category: "carnes" },
  ];
  await supabase.from("grocery_items").insert(
    groceries.map(g => ({ ...g, status: "stocked", created_by: user.id }))
  );

  // Ensure categories exist
  const { data: existingCats } = await supabase.from("categories").select("*");
  const catNames = (existingCats || []).map(c => c.name);

  const catsToCreate = [];
  if (!catNames.includes("Bebé")) catsToCreate.push({ name: "Bebé", emoji: "👶", color: "#F472B6", user_id: null });
  if (!catNames.includes("Mantención")) catsToCreate.push({ name: "Mantención", emoji: "🔧", color: "#94A3B8", user_id: null });

  if (catsToCreate.length > 0) {
    await supabase.from("categories").insert(catsToCreate);
  }

  // Get category IDs
  const { data: allCats } = await supabase.from("categories").select("*");
  const bebeCat = allCats?.find(c => c.name === "Bebé");
  const mantCat = allCats?.find(c => c.name === "Mantención");

  // Seed sample tasks
  await supabase.from("tasks").insert([
    { title: "Organizar closet bebé", category_id: bebeCat?.id || null, assigned_to: "both", priority: "media", status: "pending", created_by: user.id },
    { title: "Revisar goteras baño", category_id: mantCat?.id || null, assigned_to: user.id, priority: "alta", status: "pending", created_by: user.id, budget: 50000, currency: "CLP" },
  ]);

  return NextResponse.json({ message: "Seeded successfully" });
}
