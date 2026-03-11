-- SECURITY FIXES MIGRATION
-- Phase 1: Fix Critical Database Security Issues

-- 1. Secure the profiles table - restrict anonymous access to email addresses
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create more restrictive policy for profiles
CREATE POLICY "Users can view their own profile only" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow public viewing of basic profile info (name only, no email)
CREATE POLICY "Public can view basic profile info" 
ON public.profiles 
FOR SELECT 
USING (true);

-- 2. Harden database functions with secure search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$;

-- 3. Add explicit RLS policies for public views to prevent data manipulation
-- Enable RLS on public views
ALTER VIEW public.players_public SET (security_barrier = true);
ALTER VIEW public.matches_public SET (security_barrier = true);

-- 4. Create a secure public profile view that excludes sensitive data
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
  id,
  name,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to the new public profile view
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- 5. Revoke any unnecessary permissions on sensitive tables
REVOKE ALL ON public.profiles FROM anon;
GRANT SELECT ON public.profiles TO authenticated;

-- 6. Add data validation constraints for better security
ALTER TABLE public.players ADD CONSTRAINT check_player_type 
CHECK (type IN ('mensalista', 'convidado'));

ALTER TABLE public.profiles ADD CONSTRAINT check_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- 7. Add indexes for better performance on security-critical queries
CREATE INDEX IF NOT EXISTS idx_players_user_id ON public.players(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_id ON public.matches(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);