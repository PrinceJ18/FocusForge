-- Migration to create the recurring_expenses table for FocusForge

CREATE TABLE IF NOT EXISTS recurring_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'other',
  description text DEFAULT '',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  frequency text NOT NULL DEFAULT 'monthly', -- 'daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'half-yearly', 'yearly', 'custom'
  custom_interval integer DEFAULT 30, -- default days if custom
  payment_date date NOT NULL DEFAULT CURRENT_DATE, -- next payment date
  reminder text NOT NULL DEFAULT 'same-day', -- 'same-day', '1-day', '2-days', '3-days', '7-days', 'custom'
  reminder_custom_days integer DEFAULT 0,
  notification boolean DEFAULT true,
  icon text DEFAULT 'tag',
  color text DEFAULT '#8b5cf6',
  auto_confirm boolean DEFAULT false,
  auto_add boolean DEFAULT false,
  last_payment_date date,
  status text DEFAULT 'active', -- 'active', 'paused', 'cancelled'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own recurring expenses"
  ON recurring_expenses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurring expenses"
  ON recurring_expenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring expenses"
  ON recurring_expenses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring expenses"
  ON recurring_expenses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Performance Index
CREATE INDEX IF NOT EXISTS recurring_expenses_user_payment_idx ON recurring_expenses(user_id, payment_date ASC);
