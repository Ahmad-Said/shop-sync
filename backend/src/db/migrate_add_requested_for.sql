-- Run this against an existing database to add the requested_for column.
-- Safe to run multiple times (uses IF NOT EXISTS).
ALTER TABLE items ADD COLUMN IF NOT EXISTS requested_for UUID REFERENCES users(id) ON DELETE SET NULL;
UPDATE items SET requested_for = added_by WHERE requested_for IS NULL;
