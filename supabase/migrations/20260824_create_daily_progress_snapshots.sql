-- ============================================================================
-- FocusForge — Phase 3.9.2A: Supabase Daily Progress & Safe Spending Snapshots
-- Migration: 20260824_create_daily_progress_snapshots.sql
-- Description: Creates the daily_progress_snapshots table, constraints,
--              indexes, auto-updated_at trigger, and Row-Level Security (RLS) policies.
-- ============================================================================

-- 1. Create the Table
CREATE TABLE IF NOT EXISTS public.daily_progress_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  daily_progress_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  productivity_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  financial_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  focus_minutes INTEGER NOT NULL DEFAULT 0,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  tasks_total INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  monthly_budget NUMERIC(12,2) NOT NULL DEFAULT 0,
  remaining_budget NUMERIC(12,2) NOT NULL DEFAULT 0,
  today_spending NUMERIC(12,2) NOT NULL DEFAULT 0,
  daily_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
  remaining_safe_spending NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint: Exactly one snapshot per user per calendar day
  CONSTRAINT uq_daily_progress_snapshots_user_date UNIQUE (user_id, snapshot_date)
);

-- 2. Create Performance & Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_daily_progress_snapshots_user_id
  ON public.daily_progress_snapshots(user_id);

CREATE INDEX IF NOT EXISTS idx_daily_progress_snapshots_snapshot_date
  ON public.daily_progress_snapshots(snapshot_date);

CREATE INDEX IF NOT EXISTS idx_daily_progress_snapshots_user_date
  ON public.daily_progress_snapshots(user_id, snapshot_date DESC);

-- 3. Create Trigger Function for Automatic updated_at
CREATE OR REPLACE FUNCTION public.update_daily_progress_snapshots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach Trigger
DROP TRIGGER IF EXISTS tr_daily_progress_snapshots_updated_at ON public.daily_progress_snapshots;
CREATE TRIGGER tr_daily_progress_snapshots_updated_at
  BEFORE UPDATE ON public.daily_progress_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_daily_progress_snapshots_updated_at();

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.daily_progress_snapshots ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
DROP POLICY IF EXISTS "Users can select own daily snapshots" ON public.daily_progress_snapshots;
CREATE POLICY "Users can select own daily snapshots"
  ON public.daily_progress_snapshots
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own daily snapshots" ON public.daily_progress_snapshots;
CREATE POLICY "Users can insert own daily snapshots"
  ON public.daily_progress_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own daily snapshots" ON public.daily_progress_snapshots;
CREATE POLICY "Users can update own daily snapshots"
  ON public.daily_progress_snapshots
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
