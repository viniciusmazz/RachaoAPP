
-- Financial tables for group management

-- Monthly fee configuration per group
CREATE TABLE public.financial_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  monthly_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  guest_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id)
);

-- Payment records per player per month
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  amount NUMERIC(10,2) NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, player_id, month, year)
);

-- Cash box entries (income/expenses)
CREATE TABLE public.cash_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL DEFAULT 'outros',
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE public.financial_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_entries ENABLE ROW LEVEL SECURITY;

-- Financial config: owner can CRUD, anyone in group can read
CREATE POLICY "Anyone can view financial config" ON public.financial_config
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Group owners can manage financial config" ON public.financial_config
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.groups WHERE groups.id = financial_config.group_id AND groups.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.groups WHERE groups.id = financial_config.group_id AND groups.owner_id = auth.uid())
  );

-- Payments: owner can CRUD, anyone can read
CREATE POLICY "Anyone can view payments" ON public.payments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Group owners can manage payments" ON public.payments
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.groups WHERE groups.id = payments.group_id AND groups.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.groups WHERE groups.id = payments.group_id AND groups.owner_id = auth.uid())
  );

-- Cash entries: owner can CRUD, anyone can read
CREATE POLICY "Anyone can view cash entries" ON public.cash_entries
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Group owners can manage cash entries" ON public.cash_entries
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.groups WHERE groups.id = cash_entries.group_id AND groups.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.groups WHERE groups.id = cash_entries.group_id AND groups.owner_id = auth.uid())
  );

-- Triggers for updated_at
CREATE TRIGGER update_financial_config_updated_at BEFORE UPDATE ON public.financial_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cash_entries_updated_at BEFORE UPDATE ON public.cash_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
