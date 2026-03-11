-- Fix security vulnerability: Drop insecure matches_public view
-- The matches_public view was exposing all user match data without authentication
DROP VIEW IF EXISTS matches_public;

-- Drop insecure players_public view as well for consistency  
DROP VIEW IF EXISTS players_public;

-- These views will be replaced by proper queries to the secured matches and players tables
-- which already have proper RLS policies in place