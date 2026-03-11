-- SECURITY FIX: Remove public access to user emails
-- This fixes the critical security vulnerability where email addresses were exposed to anonymous users

-- Remove the dangerous policy that exposes user emails to the public
DROP POLICY IF EXISTS "Public can view basic profile info" ON public.profiles;

-- Clean up duplicate policies (we have two identical "view own profile" policies)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Keep only the secure policies:
-- 1. "Users can view their own profile only" - for authenticated access to own profile (including email)
-- 2. "Users can insert their own profile" - for profile creation
-- 3. "Users can update their own profile" - for profile updates

-- For public access to non-sensitive profile data, applications should use the profiles_public view
-- which excludes email addresses and other sensitive information

-- Verify the profiles_public view is properly configured (it should exclude emails)
SELECT 'profiles_public view columns: ' || string_agg(column_name, ', ' ORDER BY ordinal_position) as view_info
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles_public';