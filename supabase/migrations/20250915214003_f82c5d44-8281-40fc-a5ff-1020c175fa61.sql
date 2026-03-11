-- Create secure public views for statistics without exposing sensitive data
-- These views will allow public access to match and player data for statistics purposes
-- but won't expose user_id or other sensitive information

-- Create a public view for matches (for statistics)
CREATE VIEW matches_stats AS
SELECT 
  id,
  date,
  teams,
  events,
  report_file_path,
  created_at,
  updated_at
FROM matches;

-- Enable RLS on the view and create a public read policy
ALTER VIEW matches_stats ENABLE ROW LEVEL SECURITY;

-- Allow public read access to matches stats
CREATE POLICY "Anyone can view match statistics" 
ON matches_stats 
FOR SELECT 
USING (true);

-- Create a public view for players (for statistics)
CREATE VIEW players_stats AS
SELECT 
  id,
  name,
  type,
  photo_url,
  created_at,
  updated_at
FROM players;

-- Enable RLS on the view and create a public read policy
ALTER VIEW players_stats ENABLE ROW LEVEL SECURITY;

-- Allow public read access to players stats
CREATE POLICY "Anyone can view player statistics" 
ON players_stats 
FOR SELECT 
USING (true);