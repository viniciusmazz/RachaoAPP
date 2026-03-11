-- Enable RLS on profiles_public view/table
ALTER TABLE profiles_public ENABLE ROW LEVEL SECURITY;

-- Add policy to allow users to only see their own profile data
CREATE POLICY "Users can view their own profile data only" 
ON profiles_public 
FOR SELECT 
USING (auth.uid()::text = id::text);

-- Enable RLS on other public tables to prevent data exposure
ALTER TABLE matches_public ENABLE ROW LEVEL SECURITY;
ALTER TABLE players_public ENABLE ROW LEVEL SECURITY;

-- Add policies for matches_public (allow all users to view match data as it's meant to be public)
CREATE POLICY "Allow public access to match data" 
ON matches_public 
FOR SELECT 
USING (true);

-- Add policies for players_public (allow all users to view player data as it's meant to be public)  
CREATE POLICY "Allow public access to player data"
ON players_public 
FOR SELECT 
USING (true);