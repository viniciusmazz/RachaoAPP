
-- Create app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read app_settings" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Only super admins can update app_settings" ON public.app_settings FOR ALL TO authenticated 
  USING (auth.jwt() ->> 'email' = 'viniciusmazz@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'viniciusmazz@gmail.com');

-- Insert default logo if not exists
INSERT INTO public.app_settings (key, value)
VALUES ('app_logo', '{"url": null}')
ON CONFLICT (key) DO NOTHING;
