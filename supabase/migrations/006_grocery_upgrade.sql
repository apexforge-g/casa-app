-- Add new columns to grocery_items
ALTER TABLE grocery_items ADD COLUMN IF NOT EXISTS typical_qty TEXT;
ALTER TABLE grocery_items ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE grocery_items ADD COLUMN IF NOT EXISTS frequency_days INTEGER;
ALTER TABLE grocery_items ADD COLUMN IF NOT EXISTS last_stocked_at TIMESTAMPTZ;

-- Make created_by nullable for seeded items
ALTER TABLE grocery_items ALTER COLUMN created_by DROP NOT NULL;
