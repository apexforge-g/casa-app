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

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  emoji?: string;
}
