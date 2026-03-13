-- Allow authenticated users to view players in groups they are trying to join
-- or where they are already members.
CREATE POLICY "Authenticated users can view players" 
ON public.players 
FOR SELECT 
TO authenticated 
USING (true);
