-- Drop the insecure profiles_public view that exposes user email data
DROP VIEW IF EXISTS profiles_public;

-- The matches_public and players_public views are used for legitimate public display
-- Since they're views, we need to recreate them with proper security definer functions

-- First drop existing views
DROP VIEW IF EXISTS matches_public;
DROP VIEW IF EXISTS players_public;

-- Recreate matches_public as a secure view that only shows non-sensitive match data
CREATE VIEW matches_public WITH (security_invoker=true) AS 
SELECT 
    id,
    date,
    teams,
    events,
    report_file_path,
    created_at,
    updated_at
FROM matches;

-- Recreate players_public as a secure view that only shows non-sensitive player data  
CREATE VIEW players_public WITH (security_invoker=true) AS
SELECT 
    id,
    name,
    type,
    photo_url,
    created_at,
    updated_at
FROM players;