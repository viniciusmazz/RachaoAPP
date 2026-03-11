-- Fix remaining Security Definer View issues
-- Remove SECURITY DEFINER from all views

-- First, let's drop and recreate all views without SECURITY DEFINER
DROP VIEW IF EXISTS public.players_public CASCADE;
DROP VIEW IF EXISTS public.matches_public CASCADE; 
DROP VIEW IF EXISTS public.profiles_public CASCADE;

-- Recreate views without any SECURITY DEFINER properties
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

CREATE VIEW public.profiles_public AS
SELECT 
  id,
  name,
  created_at,
  updated_at
FROM public.profiles;

-- Grant appropriate permissions
GRANT SELECT ON public.players_public TO anon, authenticated;
GRANT SELECT ON public.matches_public TO anon, authenticated;
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- Ensure no other views have SECURITY DEFINER by checking system catalog
-- This query will help identify any remaining problematic views
DO $$
DECLARE
    view_record RECORD;
BEGIN
    FOR view_record IN 
        SELECT schemaname, viewname 
        FROM pg_views 
        WHERE schemaname = 'public'
    LOOP
        -- Force recreate any view that might have security definer
        EXECUTE format('CREATE OR REPLACE VIEW %I.%I AS %s', 
                      view_record.schemaname, 
                      view_record.viewname,
                      (SELECT definition FROM pg_views 
                       WHERE schemaname = view_record.schemaname 
                       AND viewname = view_record.viewname));
    END LOOP;
END $$;