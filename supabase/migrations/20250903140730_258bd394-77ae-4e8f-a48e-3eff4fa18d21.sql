-- Create storage bucket for match reports
INSERT INTO storage.buckets (id, name, public) 
VALUES ('match-reports', 'match-reports', false);

-- Create policies for match reports bucket
CREATE POLICY "Users can upload their own match reports" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'match-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own match reports" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'match-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own match reports" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'match-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own match reports" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'match-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add report_file_path column to matches table
ALTER TABLE matches ADD COLUMN report_file_path TEXT;