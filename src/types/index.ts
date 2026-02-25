export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
  user_id: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  category_id: string | null;
  assigned_to: string; // user_id or 'both'
  priority: 'alta' | 'media' | 'baja';
  due_date: string | null;
  status: 'pending' | 'completed';
  completed_by: string | null;
  completed_at: string | null;
  created_by: string;
  budget: number | null;
  currency: string;
  created_at: string;
  categories?: Category;
}

export interface GroceryItem {
  id: string;
  name: string;
  category: string;
  status: 'stocked' | 'low' | 'needed' | 'in_cart';
  quantity: string | null;
  typical_qty: string | null;
  brand: string | null;
  frequency_days: number | null;
  last_stocked_at: string | null;
  household_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const GROCERY_CATEGORIES = [
  { id: "lacteos", name: "Lácteos", emoji: "🥛", color: "#60A5FA" },
  { id: "carnes", name: "Carnes/Fiambre", emoji: "🥩", color: "#EF4444" },
  { id: "frutas", name: "Frutas", emoji: "🍎", color: "#F59E0B" },
  { id: "verduras", name: "Verduras", emoji: "🥬", color: "#10B981" },
  { id: "despensa", name: "Despensa", emoji: "🍞", color: "#D97706" },
  { id: "congelados", name: "Congelados", emoji: "🧊", color: "#38BDF8" },
  { id: "conservas", name: "Conservas", emoji: "🥫", color: "#FB923C" },
  { id: "limpieza", name: "Limpieza", emoji: "🧴", color: "#A78BFA" },
  { id: "higiene", name: "Higiene", emoji: "🧼", color: "#F472B6" },
  { id: "otros", name: "Otros", emoji: "📦", color: "#94A3B8" },
] as const;

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  emoji?: string;
}

export interface Bill {
  id: string;
  name: string;
  amount: number | null;
  due_day: number;
  category: string;
  auto_create_task_days: number;
  created_by: string;
  created_at: string;
}

export interface BillPayment {
  id: string;
  bill_id: string;
  month: number;
  year: number;
  paid: boolean;
  paid_by: string | null;
  paid_at: string | null;
  task_id: string | null;
  bills?: Bill;
}

export interface Routine {
  id: string;
  name: string;
  frequency_days: number;
  assigned_to: string | null;
  last_done_at: string | null;
  last_done_by: string | null;
  category: string;
  created_by: string;
  created_at: string;
}

export const BILL_CATEGORIES = [
  'Servicios', 'Arriendo', 'Seguros', 'Suscripciones', 'Otros'
] as const;

export const ROUTINE_CATEGORIES = [
  'Limpieza', 'Mantención', 'Cocina', 'Otros'
] as const;

export const FREQUENCY_OPTIONS = [
  { label: 'Diario', days: 1 },
  { label: 'Semanal', days: 7 },
  { label: 'Quincenal', days: 14 },
  { label: 'Mensual', days: 30 },
] as const;
