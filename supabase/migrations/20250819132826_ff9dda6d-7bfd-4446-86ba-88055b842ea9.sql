-- Remove conflicting RLS policies for matches
DROP POLICY IF EXISTS "Users can view their own matches" ON matches;

-- Remove conflicting RLS policies for players  
DROP POLICY IF EXISTS "Users can view their own players" ON players;