
-- Policy to allow the super admin to manage the app-settings group regardless of ownership
DROP POLICY IF EXISTS "Super admins can manage app-settings group" ON public.groups;

CREATE POLICY "Super admins can manage app-settings group" ON public.groups
FOR ALL TO authenticated
USING (
  (slug = 'app-settings' AND (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND LOWER(profiles.email) = 'viniciusmazz@gmail.com'
    )
  )) OR (auth.uid() = owner_id)
)
WITH CHECK (
  (slug = 'app-settings' AND (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND LOWER(profiles.email) = 'viniciusmazz@gmail.com'
    )
  )) OR (auth.uid() = owner_id)
);

-- Ensure anyone can read the app-settings group (for the logo on landing page)
DROP POLICY IF EXISTS "Anyone can view groups by slug" ON public.groups;
CREATE POLICY "Anyone can view groups by slug" ON public.groups FOR SELECT TO anon, authenticated USING (true);
