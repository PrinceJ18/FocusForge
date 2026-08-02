import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { AppState } from './slices/types';
import { formatLocalDate } from '../lib/dateUtils';
import { processAutoAddRecurringExpenses } from '../lib/recurringUtils';

import { createAuthSlice, defaultProfile } from './slices/authSlice';
import { createNavigationSlice } from './slices/navigationSlice';
import { createFinanceSlice } from './slices/financeSlice';
import { createProductivitySlice } from './slices/productivitySlice';
import { createFocusSlice } from './slices/focusSlice';
import { createSettingsSlice, defaultPreferences, applyPreferencesToDOM } from './slices/settingsSlice';
import { createEventsSlice } from './slices/eventsSlice';

// Re-export all types so existing imports don't break
export * from './slices/types';
export * from './storeUtils';
export { applyPreferencesToDOM, defaultPreferences } from './slices/settingsSlice';

export const useStore = create<AppState>()(
  persist(
    (...a) => ({
      ...createAuthSlice(...a),
      ...createNavigationSlice(...a),
      ...createFinanceSlice(...a),
      ...createProductivitySlice(...a),
      ...createFocusSlice(...a),
      ...createSettingsSlice(...a),
      ...createEventsSlice(...a),
    }),
    {
      name: 'spendwise-storage',
      partialize: (state) => ({
        profile: state.profile,
        pomodoroMinutes: state.pomodoroMinutes,
        breakMinutes: state.breakMinutes,
        longBreakMinutes: state.longBreakMinutes,
        timerSeconds: state.timerSeconds,
        timerRunning: state.timerRunning,
        timerMode: state.timerMode,
        sessionCount: state.sessionCount,
        timerDeadline: state.timerDeadline,
        lastCompletedDeadline: state.lastCompletedDeadline,
        timerRunDurationSeconds: state.timerRunDurationSeconds,
        timerOwnerId: state.timerOwnerId,
        userTimerStates: state.userTimerStates,
        splits: state.splits,
        events: state.events,
        recurringExpenses: state.recurringExpenses,
        preferences: state.preferences,
      }),
    }
  )
);

// Supabase data operations (kept mostly identical to avoid breaking components)
export const loadUserData = async (userId: string) => {
  const store = useStore.getState();
  const todayLocal = formatLocalDate(new Date());

  const [
    expensesRes, tasksRes, sessionsRes, goalsRes, catsRes, profileRes, eventsRes, recurringRes, prefsRes,
    sectionsRes, completionsRes, streakRes
  ] = await Promise.all([
    supabase.from('expenses').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('focus_sessions').select('*').eq('user_id', userId).order('session_date', { ascending: false }),
    supabase.from('savings_goals').select('*').eq('user_id', userId),
    supabase.from('custom_categories').select('*').eq('user_id', userId),
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('events').select('*').eq('user_id', userId).order('timestamp', { ascending: false }),
    supabase.from('recurring_expenses').select('*').eq('user_id', userId).order('payment_date', { ascending: true }),
    supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('task_sections').select('*').eq('user_id', userId).order('sort_order', { ascending: true }),
    supabase.from('task_completions').select('*').eq('user_id', userId),
    (async () => { try { return await supabase.rpc('get_current_streak', { p_today: todayLocal }); } catch { return { data: null, error: { message: 'RPC not available' } }; } })(),
  ]);

  if (expensesRes.data) store.setExpenses(expensesRes.data);
  if (tasksRes.data) store.setTasks(tasksRes.data);
  if (sessionsRes.data) store.setFocusSessions(sessionsRes.data);
  if (goalsRes.data) store.setSavingsGoals(goalsRes.data);
  if (catsRes.data) store.setCustomCategories(catsRes.data);
  
  if (sectionsRes && sectionsRes.data) {
    store.setTaskSections(sectionsRes.data);
  } else if (sectionsRes && sectionsRes.error) {
    console.warn('Task sections load failed:', sectionsRes.error.message);
  }
  
  if (completionsRes && completionsRes.data) {
    store.setTaskCompletions(completionsRes.data);
  } else if (completionsRes && completionsRes.error) {
    console.warn('Task completions load failed:', completionsRes.error.message);
  }
  
  if (eventsRes && eventsRes.data) {
    store.setEvents(eventsRes.data);
  } else if (eventsRes && eventsRes.error) {
    console.warn('Events table load failed:', eventsRes.error.message);
  }
  
  if (recurringRes && recurringRes.data) {
    store.setRecurringExpenses(recurringRes.data);
  } else if (recurringRes && recurringRes.error) {
    console.warn('Recurring expenses load failed:', recurringRes.error.message);
  }
  
  if (prefsRes && prefsRes.data) {
    store.updatePreferencesLocal(prefsRes.data);
  }

  // Determine current streak securely from server, fallback to profile if needed
  let verifiedStreak = profileRes.data?.streak || 0;
  if (streakRes.data !== null && streakRes.data !== undefined) {
    // Handling array returns or single integer from RPC
    const streakData = Array.isArray(streakRes.data) ? streakRes.data[0] : streakRes.data;
    if (typeof streakData === 'object' && streakData !== null && 'current_streak' in streakData) {
      verifiedStreak = streakData.current_streak;
    } else if (typeof streakData === 'number') {
      verifiedStreak = streakData;
    }
  } else if (streakRes.error) {
    console.warn('Streak calculation RPC failed:', streakRes.error.message);
  }

  if (profileRes.data) {
    const updatedProfile = {
      ...profileRes.data,
      streak: verifiedStreak, // Use verified streak
    };

    store.updateProfile({
      xp: updatedProfile.xp || 0,
      streak: updatedProfile.streak,
      last_active_date: updatedProfile.last_active_date || '',
      badges: updatedProfile.badges || [],
      display_name: updatedProfile.display_name || '',
      avatar_url: updatedProfile.avatar_url || '',
      daily_challenge_claims: updatedProfile.daily_challenge_claims || { date: '', claimed: [] },
    });
  }

  store.setDataLoaded(true);
};
