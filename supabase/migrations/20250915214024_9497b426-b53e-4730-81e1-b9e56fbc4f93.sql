-- Add public read policies to allow viewing statistics without authentication
-- This will allow public access to match and player data for statistics purposes

-- Add policy to allow public read access to matches for statistics
CREATE POLICY "Public can view matches for statistics" 
ON matches 
FOR SELECT 
USING (true);

-- Add policy to allow public read access to players for statistics  
CREATE POLICY "Public can view players for statistics" 
ON players 
FOR SELECT 
USING (true);