import { supabase } from '../lib/supabase';

// ============================================================================
// Daily Snapshot Service — Phase 3.9.2B
//
// The ONLY place that communicates with `daily_progress_snapshots`.
// Dashboard computes values → this service persists them to Supabase.
// Analytics and Reports will consume snapshots via this service later.
// ============================================================================

export interface DailySnapshotData {
  daily_progress_percentage: number;
  productivity_score: number;
  financial_score: number;
  focus_minutes: number;
  tasks_completed: number;
  tasks_total: number;
  current_streak: number;
  monthly_budget: number;
  remaining_budget: number;
  today_spending: number;
  daily_allowance: number;
  remaining_safe_spending: number;
}

export interface DailySnapshotRow extends DailySnapshotData {
  id: string;
  user_id: string;
  snapshot_date: string;
  created_at: string;
  updated_at: string;
}

// In-memory cache of today's last-written values to prevent redundant writes.
let cachedSnapshotDate: string | null = null;
let cachedSnapshotValues: DailySnapshotData | null = null;

/**
 * Returns true if every persisted metric in `a` and `b` are identical.
 * Used to skip redundant Supabase writes when nothing has changed.
 */
function snapshotsAreEqual(a: DailySnapshotData, b: DailySnapshotData): boolean {
  return (
    a.daily_progress_percentage === b.daily_progress_percentage &&
    a.productivity_score === b.productivity_score &&
    a.financial_score === b.financial_score &&
    a.focus_minutes === b.focus_minutes &&
    a.tasks_completed === b.tasks_completed &&
    a.tasks_total === b.tasks_total &&
    a.current_streak === b.current_streak &&
    a.monthly_budget === b.monthly_budget &&
    a.remaining_budget === b.remaining_budget &&
    a.today_spending === b.today_spending &&
    a.daily_allowance === b.daily_allowance &&
    a.remaining_safe_spending === b.remaining_safe_spending
  );
}

/**
 * UPSERT today's daily snapshot.
 * Uses ON CONFLICT (user_id, snapshot_date) DO UPDATE to guarantee
 * exactly one row per user per calendar day.
 *
 * Skips the write if all values are identical to the last-written values
 * for the same date (in-memory diff check).
 *
 * Never throws — logs errors and returns silently to avoid
 * interrupting Dashboard rendering.
 */
export async function saveDailySnapshot(
  userId: string,
  snapshotDate: string,
  data: DailySnapshotData
): Promise<void> {
  try {
    // Performance guard: skip write if values haven't changed
    if (
      cachedSnapshotDate === snapshotDate &&
      cachedSnapshotValues !== null &&
      snapshotsAreEqual(cachedSnapshotValues, data)
    ) {
      return;
    }

    const { error } = await supabase
      .from('daily_progress_snapshots')
      .upsert(
        {
          user_id: userId,
          snapshot_date: snapshotDate,
          ...data,
        },
        { onConflict: 'user_id,snapshot_date' }
      );

    if (error) {
      console.error('[dailySnapshotService] saveDailySnapshot failed:', error.message);
      return;
    }

    // Update in-memory cache on successful write
    cachedSnapshotDate = snapshotDate;
    cachedSnapshotValues = { ...data };
  } catch (err) {
    console.error('[dailySnapshotService] saveDailySnapshot unexpected error:', err);
  }
}

/**
 * Fetch today's snapshot for the authenticated user.
 * Returns null if no snapshot exists yet for today.
 */
export async function getTodaySnapshot(
  userId: string,
  todayDate: string
): Promise<DailySnapshotRow | null> {
  try {
    const { data, error } = await supabase
      .from('daily_progress_snapshots')
      .select('*')
      .eq('user_id', userId)
      .eq('snapshot_date', todayDate)
      .maybeSingle();

    if (error) {
      console.error('[dailySnapshotService] getTodaySnapshot failed:', error.message);
      return null;
    }

    // Warm the in-memory cache so subsequent saves can diff
    if (data) {
      cachedSnapshotDate = todayDate;
      cachedSnapshotValues = {
        daily_progress_percentage: Number(data.daily_progress_percentage),
        productivity_score: Number(data.productivity_score),
        financial_score: Number(data.financial_score),
        focus_minutes: data.focus_minutes,
        tasks_completed: data.tasks_completed,
        tasks_total: data.tasks_total,
        current_streak: data.current_streak,
        monthly_budget: Number(data.monthly_budget),
        remaining_budget: Number(data.remaining_budget),
        today_spending: Number(data.today_spending),
        daily_allowance: Number(data.daily_allowance),
        remaining_safe_spending: Number(data.remaining_safe_spending),
      };
    }

    return data as DailySnapshotRow | null;
  } catch (err) {
    console.error('[dailySnapshotService] getTodaySnapshot unexpected error:', err);
    return null;
  }
}

/**
 * Fetch snapshots between two dates (inclusive) for the authenticated user.
 * Returns rows ordered by snapshot_date descending.
 * Used by Analytics, Reports, and AI Insights.
 */
export async function getSnapshotsBetween(
  userId: string,
  startDate: string,
  endDate: string
): Promise<DailySnapshotRow[]> {
  try {
    const { data, error } = await supabase
      .from('daily_progress_snapshots')
      .select('*')
      .eq('user_id', userId)
      .gte('snapshot_date', startDate)
      .lte('snapshot_date', endDate)
      .order('snapshot_date', { ascending: false });

    if (error) {
      console.error('[dailySnapshotService] getSnapshotsBetween failed:', error.message);
      return [];
    }

    return (data ?? []) as DailySnapshotRow[];
  } catch (err) {
    console.error('[dailySnapshotService] getSnapshotsBetween unexpected error:', err);
    return [];
  }
}

/**
 * Fetch the most recent snapshot for the authenticated user.
 * Returns null if no snapshots exist at all.
 */
export async function getLatestSnapshot(
  userId: string
): Promise<DailySnapshotRow | null> {
  try {
    const { data, error } = await supabase
      .from('daily_progress_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[dailySnapshotService] getLatestSnapshot failed:', error.message);
      return null;
    }

    return data as DailySnapshotRow | null;
  } catch (err) {
    console.error('[dailySnapshotService] getLatestSnapshot unexpected error:', err);
    return null;
  }
}
