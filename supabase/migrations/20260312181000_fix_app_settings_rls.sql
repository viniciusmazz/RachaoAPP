
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Only super admins can update app_settings" ON public.app_settings;

-- Create a more robust policy using the profiles table
CREATE POLICY "Super admin update policy" ON public.app_settings 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND LOWER(profiles.email) = 'viniciusmazz@gmail.com'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND LOWER(profiles.email) = 'viniciusmazz@gmail.com'
    )
  );

-- Ensure the table exists (idempotent)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Re-enable RLS just in case
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Ensure read policy exists
DROP POLICY IF EXISTS "Anyone can read app_settings" ON public.app_settings;
CREATE POLICY "Anyone can read app_settings" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
