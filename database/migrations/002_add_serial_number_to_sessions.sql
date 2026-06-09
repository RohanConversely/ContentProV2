-- Add serial_number column to sessions for client mode product identification
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS serial_number text;
