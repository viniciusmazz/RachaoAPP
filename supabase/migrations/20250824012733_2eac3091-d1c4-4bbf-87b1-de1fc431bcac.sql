-- Create a public view for players that excludes sensitive user_id information
-- This view will be used for public statistics while keeping user data private
CREATE OR REPLACE VIEW public.players_public AS
SELECT 
  id,
  name,
  type,
  photo_url,
  created_at,
  updated_at
FROM public.players;

-- Grant SELECT access to the view for public use
GRANT SELECT ON public.players_public TO anon;
GRANT SELECT ON public.players_public TO authenticated;

-- Create a similar public view for matches that doesn't expose user_id
CREATE OR REPLACE VIEW public.matches_public AS
SELECT 
  id,
  date,
  teams,
  events,
  created_at,
  updated_at
FROM public.matches;

-- Grant SELECT access to the matches view for public use  
GRANT SELECT ON public.matches_public TO anon;
GRANT SELECT ON public.matches_public TO authenticated;

-- Update RLS policies to restrict direct access to the main tables
-- Remove the overly permissive public policies
DROP POLICY IF EXISTS "Anyone can view players" ON public.players;
DROP POLICY IF EXISTS "Anyone can view matches" ON public.matches;

-- Create more restrictive policies for the main tables
-- Users can only see their own data directly from the tables
CREATE POLICY "Users can view their own players" ON public.players
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own matches" ON public.matches  
  FOR SELECT USING (auth.uid() = user_id);