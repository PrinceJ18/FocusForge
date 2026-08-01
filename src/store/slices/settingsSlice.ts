import { StateCreator } from 'zustand';
import { AppState, SettingsSlice, UserPreferences } from './types';

export const defaultPreferences: UserPreferences = {
  theme: 'dark',
  accent_color: 'purple',
  card_style: 'modern',
  animation: 'full',
  font_size: 'medium',
  ui_density: 'comfortable',
  default_pomodoro: 25,
  default_short_break: 5,
  default_long_break: 15,
  auto_start_next_session: false,
  auto_start_break: false,
  auto_start_focus: false,
  play_completion_sound: true,
  enable_timer_notifications: true,
  show_full_screen_mode: false,
  focus_ring_style: 'gradient',
  default_timer_mode: 'pomodoro',
  default_daily_focus_goal: 120,
  default_task_goal: 5,
  default_xp_goal: 100,
  default_budget_goal: 10000,
  enable_goal_focus: true,
  enable_goal_tasks: true,
  enable_goal_xp: true,
  enable_goal_budget: true,
  goal_difficulty: 'medium',
  goal_order: 'focus,tasks,xp,budget',
  notify_xp: true,
  notify_level_up: true,
  notify_achievements: true,
  notify_badges: true,
  notify_goals: true,
  notify_focus_timer: true,
  notify_weekly_report: true,
  notify_monthly_report: true,
  notify_recurring_expenses: true,
  notify_budget_alerts: true,
  notify_arena_champion: true,
  notify_arena_personal_best: true,
  notify_arena_rank_up: true,
  notify_arena_activity: true,
  reminder_time: '09:00',
  notification_sound: 'default',
  currency: '₹',
  default_monthly_budget: 10000,
  budget_alert_low_warning: true,
  budget_alert_overspending: true,
  recurring_expense_reminder: true,
  week_start_day: 'monday',
  default_dashboard_view: 'weekly',
  default_analytics_chart: 'bar',
  preferred_date_format: 'yyyy-MM-dd',
  preferred_time_format: '12h',
  high_contrast: false,
  keyboard_navigation: false,
  screen_reader_support: false,
  dashboard_widgets: 'hero,goals,timer,snapshot,upcoming,insights,actions,recent,achievements,weekly,monthly,score,recommendations',
  dashboard_hidden_widgets: '',
  dashboard_compact: false,
  dashboard_pinned_widgets: '',
};

export function applyPreferencesToDOM(pref: UserPreferences) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Remove previous classes
  const classesToRemove = Array.from(root.classList).filter(
    c =>
      c.startsWith('theme-') ||
      c.startsWith('accent-') ||
      c.startsWith('card-') ||
      c.startsWith('font-') ||
      c.startsWith('density-') ||
      c === 'high-contrast-mode' ||
      c === 'reduced-motion' ||
      c === 'motion-off'
  );
  classesToRemove.forEach(c => root.classList.remove(c));

  // Add new classes
  if (pref.theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.add(isDark ? 'theme-dark' : 'theme-light');
  } else {
    root.classList.add(`theme-${pref.theme}`);
  }

  root.classList.add(`accent-${pref.accent_color}`);
  root.classList.add(`card-${pref.card_style}`);
  root.classList.add(`font-${pref.font_size}`);
  root.classList.add(`density-${pref.ui_density}`);

  if (pref.high_contrast) {
    root.classList.add('high-contrast-mode');
  }

  if (pref.animation === 'reduced') {
    root.classList.add('reduced-motion');
  } else if (pref.animation === 'off') {
    root.classList.add('motion-off');
  }
}

export const createSettingsSlice: StateCreator<AppState, [], [], SettingsSlice> = (set) => ({
  preferences: defaultPreferences,
  updatePreferencesLocal: (updates) => set((s) => {
    const next = { ...s.preferences, ...updates };
    applyPreferencesToDOM(next);
    
    const timerUpdates: Partial<AppState> = {};
    
    if (updates.default_pomodoro !== undefined) {
      const val = typeof updates.default_pomodoro === 'number' ? updates.default_pomodoro : parseInt(String(updates.default_pomodoro));
      const clamped = isNaN(val) || val <= 0 ? 25 : Math.max(1, Math.min(120, val));
      next.default_pomodoro = clamped;
      timerUpdates.pomodoroMinutes = clamped;
    }
    if (updates.default_short_break !== undefined) {
      const val = typeof updates.default_short_break === 'number' ? updates.default_short_break : parseInt(String(updates.default_short_break));
      const clamped = isNaN(val) || val <= 0 ? 5 : Math.max(1, Math.min(120, val));
      next.default_short_break = clamped;
      timerUpdates.breakMinutes = clamped;
    }
    if (updates.default_long_break !== undefined) {
      const val = typeof updates.default_long_break === 'number' ? updates.default_long_break : parseInt(String(updates.default_long_break));
      const clamped = isNaN(val) || val <= 0 ? 15 : Math.max(1, Math.min(120, val));
      next.default_long_break = clamped;
      timerUpdates.longBreakMinutes = clamped;
    }

    return { preferences: next, ...timerUpdates };
  }),
});
