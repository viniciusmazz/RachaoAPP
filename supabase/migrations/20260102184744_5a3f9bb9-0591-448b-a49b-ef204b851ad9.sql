-- Fix PUBLIC_DATA_EXPOSURE: Remove overly permissive public policies on matches and players

-- Drop the public read policy on matches that exposes all match data
DROP POLICY IF EXISTS "Public can view matches for statistics" ON public.matches;

-- Drop the public read policy on players that exposes all player data  
DROP POLICY IF EXISTS "Public can view players for statistics" ON public.players;

-- Fix STORAGE_EXPOSURE: Make match-reports bucket private
UPDATE storage.buckets SET public = false WHERE id = 'match-reports';

-- Remove the public SELECT policy on storage.objects for match-reports bucket
DROP POLICY IF EXISTS "Public can view match reports" ON storage.objects;