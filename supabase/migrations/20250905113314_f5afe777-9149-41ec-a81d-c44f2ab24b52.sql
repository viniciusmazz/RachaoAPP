-- Update the matches_public view to include report_file_path
DROP VIEW IF EXISTS matches_public;

CREATE VIEW matches_public AS 
SELECT id,
    date,
    teams,
    events,
    created_at,
    updated_at,
    report_file_path
FROM matches;