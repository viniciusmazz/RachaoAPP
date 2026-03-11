-- Add public read policies for matches and players tables
-- This allows anonymous users to view statistics while keeping write operations protected

-- Allow anyone to read matches (for public statistics)
CREATE POLICY "Anyone can view matches for statistics"
ON public.matches
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow anyone to read players (for public statistics)  
CREATE POLICY "Anyone can view players for statistics"
ON public.players
FOR SELECT
TO anon, authenticated
USING (true);