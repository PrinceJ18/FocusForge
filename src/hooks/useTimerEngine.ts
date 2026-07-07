import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { computeStreak } from '../lib/statsUtils';
import { logEvent, checkUnlocksAndMilestones } from '../lib/events';
import { formatLocalDate } from '../lib/dateUtils';

/**
 * Global timer engine — mount ONCE in App.tsx.
 *
 * Manages the setInterval for the Pomodoro countdown.
 * Because it lives in App, it never unmounts during navigation,
 * so the timer persists across all page switches.
 */
export function useTimerEngine() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRunning = useStore((s) => s.timerRunning);

  // 1. Hydration/Mount check: validate deadline and restore progress cleanly
  useEffect(() => {
    (window as any).useStore = useStore;
    const state = useStore.getState();
    const currentUserId = state.user?.id || 'anonymous';

    // Initialize owner key if missing
    if (!state.timerOwnerId) {
      useStore.setState({ timerOwnerId: currentUserId });
    }

    if (state.timerRunning && state.timerDeadline) {
      const remaining = Math.max(0, Math.ceil((state.timerDeadline - Date.now()) / 1000));
      if (remaining === 0) {
        // Expired while offline/closed
        const deadline = state.timerDeadline;
        if (deadline !== state.lastCompletedDeadline) {
          useStore.setState({ lastCompletedDeadline: deadline, timerDeadline: null, timerRunning: false });
          state.setTimerSeconds(0);
          handleTimerComplete(deadline);
        }
      } else {
        state.setTimerSeconds(remaining);
      }
    } else if (!state.timerRunning) {
      // Stopped: Safe-recovery logic for corrupted/legacy states
      const validMode = state.timerMode || 'focus';
      const validPomo = typeof state.pomodoroMinutes === 'number' && state.pomodoroMinutes > 0 ? state.pomodoroMinutes : 25;
      const validBreak = typeof state.breakMinutes === 'number' && state.breakMinutes > 0 ? state.breakMinutes : 5;
      const validLong = typeof state.longBreakMinutes === 'number' && state.longBreakMinutes > 0 ? state.longBreakMinutes : 15;
      
      const totalSeconds = validMode === 'focus' ? validPomo * 60 : validMode === 'break' ? validBreak * 60 : validLong * 60;
      
      if (typeof state.timerSeconds !== 'number' || isNaN(state.timerSeconds) || state.timerSeconds < 0 || state.timerSeconds > totalSeconds) {
        state.setTimerSeconds(totalSeconds);
      }
    }
  }, []);

  // 2. Active timer countdown ticking using absolute Date.now() deadlines
  useEffect(() => {
    if (timerRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);

      intervalRef.current = setInterval(() => {
        const state = useStore.getState();
        const deadline = state.timerDeadline;

        if (!deadline) {
          state.setTimerRunning(false);
          return;
        }

        const now = Date.now();
        if (now >= deadline) {
          // Idempotent guard: clear immediately
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          
          if (deadline !== state.lastCompletedDeadline) {
            useStore.setState({ lastCompletedDeadline: deadline, timerDeadline: null, timerRunning: false });
            state.setTimerSeconds(0);
            handleTimerComplete(deadline);
          }
        } else {
          const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
          state.setTimerSeconds(remaining);
        }
      }, 200); // Polling frequently ensures extremely precise UI ticking
    } else {
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
 * and resets mode duration without auto-switching modes.
 */
async function handleTimerComplete(deadline: number) {
  const state = useStore.getState();
  const {
    timerMode,
    pomodoroMinutes,
    breakMinutes,
    longBreakMinutes,
    timerRunDurationSeconds,
    focusSessions,
    profile,
    user,
  } = state;

  if (timerMode === 'focus') {
    // 1. Get completed minutes based on the preserved run duration
    const durationSecs = timerRunDurationSeconds !== null && timerRunDurationSeconds !== undefined 
      ? timerRunDurationSeconds 
      : (pomodoroMinutes * 60);
    const mins = Math.max(1, Math.round(durationSecs / 60));

    // Calculate XP based on completed minutes
    const xpEarned = mins >= 60 ? 30 : mins >= 45 ? 20 : mins >= 25 ? 10 : 5;

    // Get timezone-safe local date YYYY-MM-DD
    const today = formatLocalDate(new Date());

    if (user) {
      // Authenticated user pipeline: run atomic database upsert/event/XP logging
      const referenceId = `focus_${deadline}`;
      try {
        const { data, error } = await supabase.rpc('log_focus_session', {
          p_session_date: today,
          p_minutes: mins,
          p_reference_id: referenceId,
          p_today: today
        });

        if (error) {
          console.error('log_focus_session RPC failed', JSON.stringify({
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            sentPayload: {
              p_session_date: today,
              p_minutes: mins,
              p_reference_id: referenceId,
              p_today: today
            }
          }));
          throw error;
        }

        const returned = Array.isArray(data) ? data[0] : data;
        if (!returned) {
          throw new Error('No data returned from log_focus_session');
        }

        // Successfully persisted in database! Now synchronize local Zustand state.
        state.incrementSessionCount();

        // 1. Sync local focus sessions list using returned daily aggregate values
        state.upsertFocusSessionLocal({
          id: returned.id,
          session_date: returned.session_date,
          minutes: returned.minutes,
          sessions_count: returned.sessions_count
        });

        // 2. Sync profile XP, streak, and last_active_date atomically using authoritative database values
        const oldXP = profile.xp;
        const newXP = returned.total_xp;
        state.updateProfile({ 
          xp: newXP,
          streak: returned.current_streak,
          last_active_date: returned.last_active_date,
        });

        // 3. Trigger local notifications using returned xp_earned
        const xpEarned = returned.xp_earned;
        state.showNotification({
          type: 'xp',
          title: `+${xpEarned} XP Earned`,
          message: 'Focus session completed',
          xp: xpEarned,
        });

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

        // Trigger local event and check unlocks/milestones
        const localEvent = {
          id: crypto.randomUUID(),
          user_id: user.id,
          timestamp: new Date().toISOString(),
          type: 'focus_session_completed',
          category: 'focus' as const,
          reference_id: referenceId,
          metadata: {
            minutes: mins,
            xpEarned: xpEarned,
            description: `Completed focus session of ${mins} minutes`
          }
        };
        state.addEventLocal(localEvent);
        
        // Check unlocks and milestones AFTER the state updates have finalized
        await checkUnlocksAndMilestones();

      } catch (err: any) {
        console.error('Focus session logging failed:', err);
        state.showNotification({
          type: 'xp', // fallback type
          title: 'Sync Failed',
          message: 'Failed to save focus session. Please check connection.',
        });
        
        // Important: clear duration so it resets cleanly
        useStore.setState({ timerRunDurationSeconds: null });
        
        // Restore remaining seconds to configured duration
        const resetSeconds = pomodoroMinutes * 60;
        state.setTimerSeconds(resetSeconds);
        state.setTimerRunning(false);
        useStore.setState({ timerDeadline: null });
        return;
      }
    } else {
      // Guest User / Anonymous pipeline: local Zustand only
      state.incrementSessionCount();
      
      const oldXP = profile.xp;
      const newXP = oldXP + xpEarned;
      state.updateProfile({ xp: newXP });

      // Trigger notifications
      state.showNotification({
        type: 'xp',
        title: `+${xpEarned} XP Earned`,
        message: 'Focus session completed',
        xp: xpEarned,
      });

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

      // Record focus session locally
      const existing = focusSessions.find((s) => s.session_date === today);
      if (existing) {
        const updatedMinutes = existing.minutes + mins;
        const updatedCount = existing.sessions_count + 1;
        state.updateFocusSessionLocal(existing.id, {
          minutes: updatedMinutes,
          sessions_count: updatedCount,
        });
      } else {
        const newSession = {
          id: crypto.randomUUID(),
          session_date: today,
          minutes: mins,
          sessions_count: 1,
        };
        state.addFocusSessionLocal(newSession);
      }

      // Update streak
      const newStreak = computeStreak(profile.last_active_date, profile.streak);
      state.updateProfile({
        last_active_date: today,
        streak: newStreak,
      });

      // Log event locally
      const localEvent = {
        id: crypto.randomUUID(),
        user_id: 'anonymous',
        timestamp: new Date().toISOString(),
        type: 'focus_session_completed',
        category: 'focus' as const,
        reference_id: `focus_${deadline}`,
        metadata: {
          minutes: mins,
          xpEarned: xpEarned,
          description: `Completed focus session of ${mins} minutes`
        }
      };
      state.addEventLocal(localEvent);
    }
  }

  // Reset current mode timer to its configured duration and stop timer
  const resetSeconds =
    timerMode === 'focus'
      ? pomodoroMinutes * 60
      : timerMode === 'break'
        ? breakMinutes * 60
        : longBreakMinutes * 60;

  state.setTimerSeconds(resetSeconds);
  state.setTimerRunning(false);
  useStore.setState({ 
    timerDeadline: null,
    timerRunDurationSeconds: null 
  });
}
