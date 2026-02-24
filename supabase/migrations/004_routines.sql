-- Routines table
CREATE TABLE IF NOT EXISTS routines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  frequency_days INTEGER NOT NULL DEFAULT 7,
  assigned_to UUID REFERENCES auth.users(id),
  last_done_at TIMESTAMPTZ,
  last_done_by UUID REFERENCES auth.users(id),
  category TEXT NOT NULL DEFAULT 'Limpieza',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read routines" ON routines FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert routines" ON routines FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update routines" ON routines FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete routines" ON routines FOR DELETE USING (auth.uid() IS NOT NULL);
