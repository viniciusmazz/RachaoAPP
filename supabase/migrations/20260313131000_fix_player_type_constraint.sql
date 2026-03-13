-- Drop the restrictive check constraint on player type
ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_type_check;

-- Ensure user_id is nullable (it should be for players not yet linked to a user)
ALTER TABLE public.players ALTER COLUMN user_id DROP NOT NULL;

-- Add a more flexible check constraint or just leave it open
-- For now, let's just leave it open to allow 'request:new', 'claim:ID', etc.
