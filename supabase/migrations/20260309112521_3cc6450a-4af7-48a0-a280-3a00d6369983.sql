
-- Create groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  owner_id UUID NOT NULL,
  settings JSONB NOT NULL DEFAULT '{
    "sides": {
      "home": {"name": "Azul", "color": "#3B82F6", "logoUrl": null},
      "away": {"name": "Vermelho", "color": "#EF4444", "logoUrl": null}
    },
    "enabledStats": ["goals", "assists", "ownGoals"]
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add group_id to players (nullable initially for migration)
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;

-- Add group_id to matches (nullable initially for migration)
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;

-- Enable RLS on groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- RLS policies for groups
CREATE POLICY "Anyone can view groups by slug" ON public.groups FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated users can create groups" ON public.groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their groups" ON public.groups FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete their groups" ON public.groups FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- Trigger for updated_at on groups
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add slug constraint: only lowercase letters, numbers, hyphens
ALTER TABLE public.groups ADD CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' AND length(slug) >= 3 AND length(slug) <= 50);
