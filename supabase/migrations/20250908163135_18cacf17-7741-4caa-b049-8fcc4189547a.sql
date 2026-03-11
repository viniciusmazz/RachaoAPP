-- Add additional security layer: ensure auth.uid() is not null before allowing any access
-- This prevents any potential bypasses when auth.uid() might return null but still allow access

-- Drop and recreate the SELECT policy to be more explicit about requiring authentication
DROP POLICY IF EXISTS "Users can view their own profile only" ON profiles;

-- Create a more restrictive policy that explicitly requires authentication AND matching user_id
CREATE POLICY "Authenticated users can view only their own profile" 
ON profiles 
FOR SELECT 
TO authenticated 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Ensure INSERT policy also requires authentication
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

CREATE POLICY "Authenticated users can insert only their own profile" 
ON profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Ensure UPDATE policy also requires authentication  
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Authenticated users can update only their own profile" 
ON profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Explicitly deny all access to anon role
CREATE POLICY "Deny all access to anonymous users" 
ON profiles 
FOR ALL 
TO anon 
USING (false);