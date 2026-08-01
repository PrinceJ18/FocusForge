-- Migration to separate private financial data from the public profiles table
-- 1. Create the new secure table
CREATE TABLE IF NOT EXISTS public.user_financial_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_budget numeric DEFAULT 5000,
  total_savings numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.user_financial_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own financial settings"
  ON public.user_financial_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own financial settings"
  ON public.user_financial_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own financial settings"
  ON public.user_financial_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Copy existing data from profiles
INSERT INTO public.user_financial_settings (user_id, monthly_budget, total_savings)
SELECT id, monthly_budget, total_savings
FROM public.profiles
ON CONFLICT (user_id) DO UPDATE SET
  monthly_budget = EXCLUDED.monthly_budget,
  total_savings = EXCLUDED.total_savings;

-- 4. Secure the profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS monthly_budget;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS total_savings;

NOTIFY pgrst, 'reload schema';
