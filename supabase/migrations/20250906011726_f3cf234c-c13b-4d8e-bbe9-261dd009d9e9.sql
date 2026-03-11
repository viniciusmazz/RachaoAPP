-- Update match-reports bucket to be public for reading
UPDATE storage.buckets 
SET public = true 
WHERE id = 'match-reports';

-- Create policy to allow public read access to match reports
CREATE POLICY "Public can view match reports" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'match-reports');