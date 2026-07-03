-- Migration to create the user_preferences table for FocusForge

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'dark', -- 'dark', 'light', 'amoled', 'system'
  accent_color text NOT NULL DEFAULT 'purple', -- 'purple', 'blue', 'green', 'orange', 'red', 'pink'
  card_style text NOT NULL DEFAULT 'modern', -- 'rounded', 'modern', 'compact'
  animation text NOT NULL DEFAULT 'full', -- 'full', 'reduced', 'off'
  font_size text NOT NULL DEFAULT 'medium', -- 'small', 'medium', 'large'
  ui_density text NOT NULL DEFAULT 'comfortable', -- 'comfortable', 'compact'
  
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
  focus_ring_style text NOT NULL DEFAULT 'gradient', -- 'gradient', 'solid', 'neon'
  default_timer_mode text NOT NULL DEFAULT 'pomodoro', -- 'pomodoro', 'stopwatch'
  
  -- Goals
  default_daily_focus_goal integer NOT NULL DEFAULT 120, -- minutes
  default_task_goal integer NOT NULL DEFAULT 5,
  default_xp_goal integer NOT NULL DEFAULT 100,
  default_budget_goal numeric NOT NULL DEFAULT 5000,
  enable_goal_focus boolean NOT NULL DEFAULT true,
  enable_goal_tasks boolean NOT NULL DEFAULT true,
  enable_goal_xp boolean NOT NULL DEFAULT true,
  enable_goal_budget boolean NOT NULL DEFAULT true,
  goal_difficulty text NOT NULL DEFAULT 'medium', -- 'easy', 'medium', 'hard', 'adaptive'
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
  week_start_day text NOT NULL DEFAULT 'monday', -- 'sunday', 'monday'
  
  -- Analytics
  default_dashboard_view text NOT NULL DEFAULT 'weekly', -- 'weekly', 'monthly', 'yearly'
  default_analytics_chart text NOT NULL DEFAULT 'bar', -- 'bar', 'line', 'area'
  preferred_date_format text NOT NULL DEFAULT 'yyyy-MM-dd',
  preferred_time_format text NOT NULL DEFAULT '12h', -- '12h', '24h'
  
  -- Accessibility
  high_contrast boolean NOT NULL DEFAULT false,
  keyboard_navigation boolean NOT NULL DEFAULT false,
  screen_reader_support boolean NOT NULL DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Policies
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
