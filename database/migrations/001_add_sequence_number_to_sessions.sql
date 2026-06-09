-- Add nullable sequence_number column to sessions for client mode ordering
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS sequence_number integer;
