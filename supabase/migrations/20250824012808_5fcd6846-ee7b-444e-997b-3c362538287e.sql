-- Fix the security definer view issues by recreating views properly
-- Drop and recreate views without SECURITY DEFINER
DROP VIEW IF EXISTS public.players_public;
DROP VIEW IF EXISTS public.matches_public;

-- Recreate views with proper security settings
CREATE VIEW public.players_public AS
SELECT 
  id,
  name,
  type,
  photo_url,
  created_at,
  updated_at
FROM public.players;

CREATE VIEW public.matches_public AS
SELECT 
  id,
  date,
  teams,
  events,
  created_at,
  updated_at
FROM public.matches;

-- Ensure proper access grants
GRANT SELECT ON public.players_public TO anon, authenticated;
GRANT SELECT ON public.matches_public TO anon, authenticated;