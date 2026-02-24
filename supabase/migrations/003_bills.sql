-- Bills table
CREATE TABLE IF NOT EXISTS bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  amount NUMERIC,
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  category TEXT NOT NULL DEFAULT 'Servicios',
  auto_create_task_days INTEGER NOT NULL DEFAULT 3,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bill payments table
CREATE TABLE IF NOT EXISTS bill_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_by UUID REFERENCES auth.users(id),
  paid_at TIMESTAMPTZ,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  UNIQUE(bill_id, month, year)
);

-- RLS
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read bills" ON bills FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert bills" ON bills FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update bills" ON bills FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete bills" ON bills FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read bill_payments" ON bill_payments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert bill_payments" ON bill_payments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update bill_payments" ON bill_payments FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete bill_payments" ON bill_payments FOR DELETE USING (auth.uid() IS NOT NULL);
