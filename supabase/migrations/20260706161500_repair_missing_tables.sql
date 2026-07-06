-- Migration to create the missing events, recurring_expenses, and user_preferences tables for FocusForge

-- ==========================================
-- 1. Create events table
-- ==========================================
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp timestamptz DEFAULT now(),
  type text NOT NULL,
  category text NOT NULL,
  reference_id text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Safely recreate policies for events
DROP POLICY IF EXISTS "Users can view own events" ON events;
DROP POLICY IF EXISTS "Users can insert own events" ON events;
DROP POLICY IF EXISTS "Users can update own events" ON events;
DROP POLICY IF EXISTS "Users can delete own events" ON events;

CREATE POLICY "Users can view own events"
  ON events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events"
  ON events FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own events"
  ON events FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create performance index
CREATE INDEX IF NOT EXISTS events_user_timestamp_idx ON events(user_id, timestamp DESC);


-- ==========================================
-- 2. Create recurring_expenses table
-- ==========================================
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0 CONSTRAINT recurring_expenses_amount_check CHECK (amount >= 0),
  category text NOT NULL DEFAULT 'other',
  description text DEFAULT '',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date CONSTRAINT recurring_expenses_end_date_check CHECK (end_date IS NULL OR end_date >= start_date),
  frequency text NOT NULL DEFAULT 'monthly', -- 'daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'half-yearly', 'yearly', 'custom'
  custom_interval integer DEFAULT 30 CONSTRAINT recurring_expenses_interval_check CHECK (custom_interval IS NULL OR custom_interval > 0),
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

-- Safely recreate policies for recurring_expenses
DROP POLICY IF EXISTS "Users can view own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can insert own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can update own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can delete own recurring expenses" ON recurring_expenses;

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

-- Create performance index
CREATE INDEX IF NOT EXISTS recurring_expenses_user_payment_idx ON recurring_expenses(user_id, payment_date ASC);


-- ==========================================
-- 3. Create user_preferences table
-- ==========================================
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'dark',
  accent_color text NOT NULL DEFAULT 'purple',
  card_style text NOT NULL DEFAULT 'modern',
  animation text NOT NULL DEFAULT 'full',
  font_size text NOT NULL DEFAULT 'medium',
  ui_density text NOT NULL DEFAULT 'comfortable',
  
  -- Focus
  default_pomodoro integer NOT NULL DEFAULT 25,
  default_short_break integer NOT NULL DEFAULT 5,
  default_long_break integer NOT NULL DEFAULT 15,
  auto_start_next_session boolean NOT NULL DEFAULT false,
  auto_start_break boolean NOT NULL DEFAULT false,
  auto_start_focus boolean NOT NULL DEFAULT false,
  play_completion_sound boolean NOT NULL DEFAULT true,
  enable_timer_notifications boolean NOT NULL DEFAULT true,
  show_full_screen_mode boolean NOT NULL DEFAULT false,
  focus_ring_style text NOT NULL DEFAULT 'gradient',
  default_timer_mode text NOT NULL DEFAULT 'pomodoro',
  
  -- Goals
  default_daily_focus_goal integer NOT NULL DEFAULT 120,
  default_task_goal integer NOT NULL DEFAULT 5,
  default_xp_goal integer NOT NULL DEFAULT 100,
  default_budget_goal numeric NOT NULL DEFAULT 5000,
  enable_goal_focus boolean NOT NULL DEFAULT true,
  enable_goal_tasks boolean NOT NULL DEFAULT true,
  enable_goal_xp boolean NOT NULL DEFAULT true,
  enable_goal_budget boolean NOT NULL DEFAULT true,
  goal_difficulty text NOT NULL DEFAULT 'medium',
  goal_order text NOT NULL DEFAULT 'focus,tasks,xp,budget',
  
  -- Notifications
  notify_xp boolean NOT NULL DEFAULT true,
  notify_level_up boolean NOT NULL DEFAULT true,
  notify_achievements boolean NOT NULL DEFAULT true,
  notify_badges boolean NOT NULL DEFAULT true,
  notify_goals boolean NOT NULL DEFAULT true,
  notify_focus_timer boolean NOT NULL DEFAULT true,
  notify_weekly_report boolean NOT NULL DEFAULT true,
  notify_monthly_report boolean NOT NULL DEFAULT true,
  notify_recurring_expenses boolean NOT NULL DEFAULT true,
  notify_budget_alerts boolean NOT NULL DEFAULT true,
  reminder_time text NOT NULL DEFAULT '09:00',
  notification_sound text NOT NULL DEFAULT 'default',
  
  -- Finance
  currency text NOT NULL DEFAULT '₹',
  default_monthly_budget numeric NOT NULL DEFAULT 5000,
  budget_alert_low_warning boolean NOT NULL DEFAULT true,
  budget_alert_overspending boolean NOT NULL DEFAULT true,
  recurring_expense_reminder boolean NOT NULL DEFAULT true,
  week_start_day text NOT NULL DEFAULT 'monday',
  
  -- Analytics
  default_dashboard_view text NOT NULL DEFAULT 'weekly',
  default_analytics_chart text NOT NULL DEFAULT 'bar',
  preferred_date_format text NOT NULL DEFAULT 'yyyy-MM-dd',
  preferred_time_format text NOT NULL DEFAULT '12h',
  
  -- Accessibility
  high_contrast boolean NOT NULL DEFAULT false,
  keyboard_navigation boolean NOT NULL DEFAULT false,
  screen_reader_support boolean NOT NULL DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Safely recreate policies for user_preferences
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;

CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
