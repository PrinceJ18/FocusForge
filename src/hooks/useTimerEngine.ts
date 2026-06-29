import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { computeStreak } from '../lib/statsUtils';

/**
 * Global timer engine — mount ONCE in App.tsx.
 *
 * Manages the setInterval for the Pomodoro countdown.
 * Because it lives in App, it never unmounts during navigation,
 * so the timer persists across all page switches.
 */
export function useTimerEngine() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Subscribe only to `timerRunning` to control start/stop of the interval.
  const timerRunning = useStore((s) => s.timerRunning);

  useEffect(() => {
    if (timerRunning) {
      // Clear any stale interval before starting a new one
      if (intervalRef.current) clearInterval(intervalRef.current);

      intervalRef.current = setInterval(() => {
        const state = useStore.getState();
        const current = state.timerSeconds;

        if (current <= 1) {
          // Timer reached 0 — complete the session
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          state.setTimerRunning(false);
          state.setTimerSeconds(0);
          handleTimerComplete();
        } else {
          state.setTimerSeconds(current - 1);
        }
      }, 1000);
    } else {
      // Timer paused or stopped — clear the interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerRunning]);
}

/**
 * Handles focus session completion, XP award, streak update,
 * and auto-switch to break/focus mode.
 *
 * Reads all state via useStore.getState() to avoid stale closures.
 */
async function handleTimerComplete() {
  const state = useStore.getState();
  const {
    timerMode,
    pomodoroMinutes,
    breakMinutes,
    longBreakMinutes,
    sessionCount,
    focusSessions,
    profile,
    user,
  } = state;

  if (timerMode === 'focus') {
    const mins = pomodoroMinutes;
    state.incrementSessionCount();

    // Calculate XP based on session duration
    const xpEarned =
      mins >= 60 ? 30 : mins >= 45 ? 20 : mins >= 25 ? 10 : 5;

    const oldXP = state.profile.xp;
    await state.addXP(xpEarned);
    const newXP = useStore.getState().profile.xp;

    // Trigger notifications
    state.showNotification({
      type: 'xp',
      title: `+${xpEarned} XP Earned`,
      message: 'Focus session completed',
      xp: xpEarned,
    });

    // Check for level up
    const oldLevel = Math.floor(oldXP / 100) + 1;
    const newLevel = Math.floor(newXP / 100) + 1;
    if (newLevel > oldLevel) {
      setTimeout(() => {
        state.showNotification({
          type: 'level',
          title: `Level ${newLevel} Unlocked!`,
          message: `You've reached a new milestone`,
        });
      }, 600);
    }

    // Record focus session
    const today = format(new Date(), 'yyyy-MM-dd');
    const existing = focusSessions.find((s) => s.session_date === today);

    if (existing) {
      // Update existing session in-place (no duplicates)
      const updatedMinutes = existing.minutes + mins;
      const updatedCount = existing.sessions_count + 1;

      state.updateFocusSessionLocal(existing.id, {
        minutes: updatedMinutes,
        sessions_count: updatedCount,
      });

      if (user) {
        await supabase.from('focus_sessions').upsert({
          id: existing.id,
          user_id: user.id,
          session_date: today,
          minutes: updatedMinutes,
          sessions_count: updatedCount,
        });
      }
    } else {
      // Create new session for today
      const newSession = {
        id: crypto.randomUUID(),
        session_date: today,
        minutes: mins,
        sessions_count: 1,
      };
      state.addFocusSessionLocal(newSession);

      if (user) {
        const { data } = await supabase
          .from('focus_sessions')
          .insert({ user_id: user.id, ...newSession })
          .select()
          .single();
        if (data) {
          // Replace the optimistic local entry with the server one
          state.updateFocusSessionLocal(newSession.id, {
            id: data.id,
            minutes: data.minutes,
            sessions_count: data.sessions_count,
          });
        }
      }
    }

    // Update streak using calendar-day-based calculation
    const newStreak = computeStreak(profile.last_active_date, profile.streak);

    state.updateProfile({
      last_active_date: format(new Date(), 'yyyy-MM-dd'),
      streak: newStreak,
    });

    if (user) {
      await supabase.from('profiles').upsert({
        id: user.id,
        last_active_date: format(new Date(), 'yyyy-MM-dd'),
        streak: newStreak,
        updated_at: new Date().toISOString(),
      });
    }

    // Auto-switch to break mode
    // sessionCount was already incremented, so read the latest value
    const updatedSessionCount = useStore.getState().sessionCount;
    const nextMode = updatedSessionCount % 4 === 0 ? 'longbreak' : 'break';
    state.setTimerMode(nextMode as any);
    state.setTimerSeconds(
      nextMode === 'longbreak' ? longBreakMinutes * 60 : breakMinutes * 60
    );
  } else {
    // Break completed — switch back to focus
    state.setTimerMode('focus');
    state.setTimerSeconds(pomodoroMinutes * 60);
  }
}
