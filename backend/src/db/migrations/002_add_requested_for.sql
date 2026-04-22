ALTER TABLE items ADD COLUMN IF NOT EXISTS requested_for UUID REFERENCES users(id) ON DELETE SET NULL;
UPDATE items SET requested_for = added_by WHERE requested_for IS NULL;

