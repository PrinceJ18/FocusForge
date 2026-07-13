BEGIN;

CREATE OR REPLACE FUNCTION public.unlock_achievement(p_achievement_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_user_id UUID;
  v_achievement_id TEXT;
  v_xp_reward INTEGER;
  v_title TEXT;
  v_description TEXT;
  v_qualified BOOLEAN := FALSE;
  v_already_unlocked BOOLEAN := FALSE;
  v_total_xp INTEGER;
  v_metadata JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_achievement_id := trim(p_achievement_id);
  IF v_achievement_id IS NULL OR v_achievement_id = '' THEN
    RAISE EXCEPTION 'Achievement ID cannot be empty';
  END IF;

  -- Reject unsupported IDs using the server-owned achievement mapping
  CASE v_achievement_id
    WHEN 'ach_100_pomodoros' THEN
      v_title := '100 Pomodoros';
      v_description := 'Complete 100 focus sessions';
      v_xp_reward := 100;
    WHEN 'ach_30_day_streak' THEN
      v_title := '30 Day Streak';
      v_description := 'Maintain a 30 day daily streak';
      v_xp_reward := 250;
    WHEN 'ach_save_10k' THEN
      v_title := 'Saved ₹10,000';
      v_description := 'Accumulate ₹10,000 or more in total savings goals';
      v_xp_reward := 200;
    WHEN 'ach_level_10' THEN
      v_title := 'Level 10';
      v_description := 'Reach Level 10';
      v_xp_reward := 500;
    WHEN 'ach_250_hours_focus' THEN
      v_title := 'Studied 250 Hours';
      v_description := 'Spend 250 hours in focus sessions';
      v_xp_reward := 400;
    WHEN 'ach_first_subscription' THEN
      v_title := 'First Subscription';
      v_description := 'Track at least one active subscription or bill';
      v_xp_reward := 100;
    WHEN 'ach_never_missed_payment' THEN
      v_title := 'Never Missed Payment';
      v_description := 'Complete payments without skipping';
      v_xp_reward := 150;
    WHEN 'ach_12_months_on_time' THEN
      v_title := '12 Months On Time';
      v_description := 'Complete 12 recurring bill payments';
      v_xp_reward := 300;
    WHEN 'ach_subscription_master' THEN
      v_title := 'Subscription Master';
      v_description := 'Track 5 or more active subscriptions or bills';
      v_xp_reward := 200;
    WHEN 'ach_budget_planner' THEN
      v_title := 'Budget Planner';
      v_description := 'Define a monthly budget of ₹10,000 or more';
      v_xp_reward := 100;
    WHEN 'ach_savings_expert' THEN
      v_title := 'Savings Expert';
      v_description := 'Complete 3 savings goals';
      v_xp_reward := 250;
    ELSE
      RAISE EXCEPTION 'Unknown or unsupported achievement ID: %', v_achievement_id;
  END CASE;

  -- Lock the authenticated user's profile row
  PERFORM 1
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- =====================================================================================
  -- Phase 6.3A: Legacy Achievement Compatibility Policy
  -- =====================================================================================
  -- 1. legacy achievement_unlocked rows are intentionally preserved;
  -- 2. any legacy or canonical unlock identity prevents re-awarding;
  -- 3. no historical XP is recalculated;
  -- 4. no legacy rows are converted into xp_earned ledger events;
  -- 5. new unlocks use canonical reference_id + metadata.xp_earned through private.award_xp_internal.
  -- =====================================================================================

  -- Get authoritative total XP initially to return if not qualified/already unlocked
  SELECT xp INTO v_total_xp FROM public.profiles WHERE id = v_user_id;

  -- Check any legacy OR canonical existing unlock event
  SELECT TRUE INTO v_already_unlocked
  FROM public.events
  WHERE user_id = v_user_id
    AND type = 'achievement_unlocked'
    AND (
      reference_id = v_achievement_id
      OR metadata->>'achievementId' = v_achievement_id
      OR metadata->>'achievement_id' = v_achievement_id
    );

  IF v_already_unlocked THEN
    RETURN jsonb_build_object(
      'achievement_id', v_achievement_id,
      'unlocked', TRUE,
      'already_unlocked', TRUE,
      'xp_earned', 0,
      'total_xp', v_total_xp
    );
  END IF;

  -- Determine Qualification based on approved list
  CASE v_achievement_id
    WHEN 'ach_100_pomodoros' THEN
      SELECT (COALESCE(SUM(COALESCE(sessions_count, 1)), 0) >= 100) INTO v_qualified
      FROM public.focus_sessions
      WHERE user_id = v_user_id;

    WHEN 'ach_30_day_streak' THEN
      SELECT (GREATEST(COALESCE(streak, 0), 1) >= 30) INTO v_qualified
      FROM public.profiles
      WHERE id = v_user_id;

    WHEN 'ach_save_10k' THEN
      SELECT 
        CASE 
          WHEN p.total_savings IS NOT NULL AND p.total_savings > 0 THEN (p.total_savings >= 10000)
          ELSE (COALESCE(s.sum_current, 0) >= 10000)
        END INTO v_qualified
      FROM public.profiles p
      LEFT JOIN (
        SELECT user_id, SUM(current_amount) AS sum_current
        FROM public.savings_goals
        WHERE user_id = v_user_id
        GROUP BY user_id
      ) s ON s.user_id = p.id
      WHERE p.id = v_user_id;

    WHEN 'ach_level_10' THEN
      SELECT (FLOOR(COALESCE(xp, 0) / 100) + 1 >= 10) INTO v_qualified
      FROM public.profiles
      WHERE id = v_user_id;

    WHEN 'ach_250_hours_focus' THEN
      SELECT (FLOOR(COALESCE(SUM(minutes), 0) / 60) >= 250) INTO v_qualified
      FROM public.focus_sessions
      WHERE user_id = v_user_id;

    WHEN 'ach_first_subscription' THEN
      SELECT (COUNT(*) >= 1) INTO v_qualified
      FROM public.recurring_expenses
      WHERE user_id = v_user_id AND status = 'active';

    WHEN 'ach_never_missed_payment' THEN
      SELECT (
        (COALESCE(SUM(CASE WHEN type = 'payment_skipped' THEN 1 ELSE 0 END), 0) = 0) AND
        (COALESCE(SUM(CASE WHEN type = 'payment_completed' THEN 1 ELSE 0 END), 0) >= 1)
      ) INTO v_qualified
      FROM public.events
      WHERE user_id = v_user_id;

    WHEN 'ach_12_months_on_time' THEN
      SELECT (COUNT(*) >= 12) INTO v_qualified
      FROM public.events
      WHERE user_id = v_user_id AND type = 'payment_completed';

    WHEN 'ach_subscription_master' THEN
      SELECT (COUNT(*) >= 5) INTO v_qualified
      FROM public.recurring_expenses
      WHERE user_id = v_user_id AND status = 'active';

    WHEN 'ach_budget_planner' THEN
      SELECT (COALESCE(monthly_budget, 0) >= 10000) INTO v_qualified
      FROM public.profiles
      WHERE id = v_user_id;

    WHEN 'ach_savings_expert' THEN
      SELECT (COUNT(*) >= 3) INTO v_qualified
      FROM public.savings_goals
      WHERE user_id = v_user_id AND current_amount >= target_amount;
  END CASE;

  IF NOT v_qualified THEN
    RETURN jsonb_build_object(
      'achievement_id', v_achievement_id,
      'unlocked', FALSE,
      'already_unlocked', FALSE,
      'xp_earned', 0,
      'total_xp', v_total_xp
    );
  END IF;

  -- Prepare metadata
  v_metadata := jsonb_build_object(
    'achievementId', v_achievement_id,
    'achievement_id', v_achievement_id,
    'achievementTitle', v_title,
    'description', v_description
  );

  -- Award XP and insert event atomically
  v_total_xp := private.award_xp_internal(
    v_user_id,
    v_xp_reward,
    'achievement_unlocked',
    'achievements',
    v_achievement_id,
    v_metadata
  );

  RETURN jsonb_build_object(
    'achievement_id', v_achievement_id,
    'unlocked', TRUE,
    'already_unlocked', FALSE,
    'xp_earned', v_xp_reward,
    'total_xp', v_total_xp
  );
END;
$$;

ALTER FUNCTION public.unlock_achievement(TEXT) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.unlock_achievement(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unlock_achievement(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.unlock_achievement(TEXT) TO authenticated;

COMMIT;
