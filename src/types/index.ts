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
  created_at: string;
  categories?: Category;
}

export interface GroceryItem {
  id: string;
  name: string;
  category: string;
  status: 'stocked' | 'low' | 'needed' | 'in_cart';
  quantity: string | null;
  household_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const GROCERY_CATEGORIES = [
  { name: 'Carnes', emoji: '🥩', color: '#EF4444' },
  { name: 'Verduras/Frutas', emoji: '🥬', color: '#22C55E' },
  { name: 'Lácteos', emoji: '🧀', color: '#FBBF24' },
  { name: 'Limpieza', emoji: '🧹', color: '#60A5FA' },
  { name: 'Despensa', emoji: '🫙', color: '#F97316' },
  { name: 'Congelados', emoji: '🧊', color: '#38BDF8' },
  { name: 'Bebidas', emoji: '🥤', color: '#A78BFA' },
  { name: 'Otros', emoji: '📦', color: '#94A3B8' },
] as const;

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  emoji?: string;
}
