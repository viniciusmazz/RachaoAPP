-- Allow group owners and admins to fully manage players in their group
-- (INSERT, UPDATE, DELETE), regardless of user_id being null (unlinked players)

CREATE POLICY "Group owners can insert players"
ON public.players
FOR INSERT TO authenticated
WITH CHECK (
  group_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.groups
    WHERE groups.id = players.group_id
      AND groups.owner_id = auth.uid()
  )
);

CREATE POLICY "Group owners can update players"
ON public.players
FOR UPDATE TO authenticated
USING (
  group_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.groups
    WHERE groups.id = players.group_id
      AND groups.owner_id = auth.uid()
  )
)
WITH CHECK (
  group_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.groups
    WHERE groups.id = players.group_id
      AND groups.owner_id = auth.uid()
  )
);

CREATE POLICY "Group owners can delete players"
ON public.players
FOR DELETE TO authenticated
USING (
  group_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.groups
    WHERE groups.id = players.group_id
      AND groups.owner_id = auth.uid()
  )
);
