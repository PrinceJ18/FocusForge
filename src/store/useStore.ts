import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { AppEvent } from '../lib/events';
export type Priority = 'low' | 'medium' | 'high';
export type TimerMode = 'focus' | 'break' | 'longbreak';

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  note: string;
  expense_date: string;
  created_at: string;
}

export interface RecurringExpense {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  category: string;
  description: string;
  start_date: string;
  end_date: string | null;
  frequency: string;
  custom_interval: number;
  payment_date: string;
  reminder: string;
  reminder_custom_days: number;
  notification: boolean;
  icon: string;
  color: string;
  auto_confirm: boolean;
  auto_add: boolean;
  last_payment_date: string | null;
  status: string;
  created_at: string;
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'amoled' | 'system';
  accent_color: 'purple' | 'blue' | 'green' | 'orange' | 'red' | 'pink';
  card_style: 'rounded' | 'modern' | 'compact';
  animation: 'full' | 'reduced' | 'off';
  font_size: 'small' | 'medium' | 'large';
  ui_density: 'comfortable' | 'compact';
  
  // Focus
  default_pomodoro: number;
  default_short_break: number;
  default_long_break: number;
  auto_start_next_session: boolean;
  auto_start_break: boolean;
  auto_start_focus: boolean;
  play_completion_sound: boolean;
  enable_timer_notifications: boolean;
  show_full_screen_mode: boolean;
  focus_ring_style: 'gradient' | 'solid' | 'neon';
  default_timer_mode: 'pomodoro' | 'stopwatch';
  
  // Goals
  default_daily_focus_goal: number;
  default_task_goal: number;
  default_xp_goal: number;
  default_budget_goal: number;
  enable_goal_focus: boolean;
  enable_goal_tasks: boolean;
  enable_goal_xp: boolean;
  enable_goal_budget: boolean;
  goal_difficulty: 'easy' | 'medium' | 'hard' | 'adaptive';
  goal_order: string;
  
  // Notifications
  notify_xp: boolean;
  notify_level_up: boolean;
  notify_achievements: boolean;
  notify_badges: boolean;
  notify_goals: boolean;
  notify_focus_timer: boolean;
  notify_weekly_report: boolean;
  notify_monthly_report: boolean;
  notify_recurring_expenses: boolean;
  notify_budget_alerts: boolean;
  reminder_time: string;
  notification_sound: string;
  
  // Finance
  currency: string;
  default_monthly_budget: number;
  budget_alert_low_warning: boolean;
  budget_alert_overspending: boolean;
  recurring_expense_reminder: boolean;
  week_start_day: 'sunday' | 'monday';
  
  // Analytics
  default_dashboard_view: 'weekly' | 'monthly' | 'yearly';
  default_analytics_chart: 'bar' | 'line' | 'area';
  preferred_date_format: string;
  preferred_time_format: '12h' | '24h';
  
  // Accessibility
  high_contrast: boolean;
  keyboard_navigation: boolean;
  screen_reader_support: boolean;

  // Dashboard customization
  dashboard_widgets: string;
  dashboard_hidden_widgets: string;
  dashboard_compact: boolean;
  dashboard_pinned_widgets: string;
}

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
  default_budget_goal: 5000,
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
  reminder_time: '09:00',
  notification_sound: 'default',
  currency: '₹',
  default_monthly_budget: 5000,
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

export interface Task {
  id: string;
  title: string;
  priority: Priority;
  deadline: string | null;
  completed: boolean;
  subject: string;
  created_at: string;
  completed_at: string | null;
  xp_awarded?: boolean;
}

export interface FocusSession {
  id: string;
  session_date: string;
  minutes: number;
  sessions_count: number;
}

export interface SavingsGoal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  color: string;
}

export interface CustomCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Profile {
  xp: number;
  streak: number;
  last_active_date: string;
  monthly_budget: number;
  total_savings: number;
  badges: Array<{ id: string; name: string; icon: string; unlockedAt: string }>;
  display_name: string;
  avatar_url: string;
  daily_challenge_claims?: {
    date: string;
    claimed: string[];
  };
}

export type Page = 'dashboard' | 'finance' | 'productivity' | 'analytics' | 'rewards' | 'splits' | 'reports' | 'achievements' | 'settings';

export type NotificationType = 'xp' | 'level' | 'badge' | 'challenge' | 'achievement' | 'goal';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  xp?: number;
}

interface AppState {
  // Auth
  user: User | null;
  profile: Profile;
  setUser: (user: User | null) => void;

  // Navigation
  currentPage: Page;
  setPage: (page: Page) => void;

  // Finance
  expenses: Expense[];
  savingsGoals: SavingsGoal[];
  customCategories: CustomCategory[];
  setExpenses: (expenses: Expense[]) => void;
  setSavingsGoals: (goals: SavingsGoal[]) => void;
  setCustomCategories: (cats: CustomCategory[]) => void;
  addExpenseLocal: (expense: Expense) => void;
  removeExpenseLocal: (id: string) => void;

  // Tasks
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTaskLocal: (task: Task) => void;
  updateTaskLocal: (id: string, updates: Partial<Task>) => void;
  removeTaskLocal: (id: string) => void;

  // Focus
  focusSessions: FocusSession[];
  setFocusSessions: (sessions: FocusSession[]) => void;
  addFocusSessionLocal: (session: FocusSession) => void;
  updateFocusSessionLocal: (id: string, updates: Partial<FocusSession>) => void;

  // Timer state (not persisted to DB)
  timerSeconds: number;
  timerRunning: boolean;
  timerMode: TimerMode;
  pomodoroMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  sessionCount: number;
  setTimerSeconds: (s: number) => void;
  setTimerRunning: (r: boolean) => void;
  setTimerMode: (m: TimerMode) => void;
  setPomodoroMinutes: (m: number) => void;
  incrementSessionCount: () => void;
  resetTimer: () => void;

  // Profile
  updateProfile: (updates: Partial<Profile>) => void;
  addXP: (amount: number) => Promise<void>;

  // Data loading
  dataLoaded: boolean;
  setDataLoaded: (loaded: boolean) => void;

  // Splits
  splits: Array<{ id: string; name: string; amount: number; type: 'owe' | 'owed'; date: string; settled: boolean }>;
  addSplitLocal: (split: AppState['splits'][0]) => void;
  removeSplitLocal: (id: string) => void;
  setSplits: (splits: AppState['splits']) => void;

  // Notifications (not persisted)
  notifications: AppNotification[];
  showNotification: (notification: Omit<AppNotification, 'id'>) => void;
  dismissNotification: (id: string) => void;

  // Events
  events: AppEvent[];
  setEvents: (events: AppEvent[]) => void;
  addEventLocal: (event: AppEvent) => void;

  // Recurring Expenses
  recurringExpenses: RecurringExpense[];
  setRecurringExpenses: (expenses: RecurringExpense[]) => void;
  addRecurringExpenseLocal: (expense: RecurringExpense) => void;
  updateRecurringExpenseLocal: (id: string, updates: Partial<RecurringExpense>) => void;
  removeRecurringExpenseLocal: (id: string) => void;

  // Preferences
  preferences: UserPreferences;
  updatePreferencesLocal: (updates: Partial<UserPreferences>) => void;
}

const defaultProfile: Profile = {
  xp: 0,
  streak: 0,
  last_active_date: '',
  monthly_budget: 5000,
  total_savings: 0,
  badges: [],
  display_name: '',
  avatar_url: '',
  daily_challenge_claims: {
    date: '',
    claimed: [],
  },
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: defaultProfile,
      setUser: (user) => set({ user }),

      currentPage: 'dashboard',
      setPage: (page) => set({ currentPage: page }),

      expenses: [],
      savingsGoals: [],
      customCategories: [],
      setExpenses: (expenses) => set({ expenses }),
      setSavingsGoals: (savingsGoals) => set({ savingsGoals }),
      setCustomCategories: (customCategories) => set({ customCategories }),
      addExpenseLocal: (expense) => set((s) => ({ expenses: [expense, ...s.expenses] })),
      removeExpenseLocal: (id) => set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),

      tasks: [],
      setTasks: (tasks) => set({ tasks }),
      addTaskLocal: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),
      updateTaskLocal: (id, updates) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) })),
      removeTaskLocal: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      focusSessions: [],
      setFocusSessions: (focusSessions) => set({ focusSessions }),
      addFocusSessionLocal: (session) =>
        set((s) => ({ focusSessions: [session, ...s.focusSessions] })),
      updateFocusSessionLocal: (id, updates) =>
        set((s) => ({
          focusSessions: s.focusSessions.map((fs) =>
            fs.id === id ? { ...fs, ...updates } : fs
          ),
        })),

      timerSeconds: 25 * 60,
      timerRunning: false,
      timerMode: 'focus',
      pomodoroMinutes: 25,
      breakMinutes: 5,
      longBreakMinutes: 15,
      sessionCount: 0,
      setTimerSeconds: (timerSeconds) => set({ timerSeconds }),
      setTimerRunning: (timerRunning) => set({ timerRunning }),
      setTimerMode: (timerMode) => set({ timerMode }),
      setPomodoroMinutes: (pomodoroMinutes) => set({ pomodoroMinutes }),
      incrementSessionCount: () => set((s) => ({ sessionCount: s.sessionCount + 1 })),
      resetTimer: () => {
        const { timerMode, pomodoroMinutes, breakMinutes, longBreakMinutes } = get();
        const seconds =
          timerMode === 'focus'
            ? pomodoroMinutes * 60
            : timerMode === 'break'
              ? breakMinutes * 60
              : longBreakMinutes * 60;
        set({ timerSeconds: seconds, timerRunning: false });
      },

      updateProfile: (updates) => set((s) => ({ profile: { ...s.profile, ...updates } })),
      addXP: async (amount) => {
        const { profile, user } = get();

        const oldLevel = Math.floor(profile.xp / 100) + 1;
        const newXP = profile.xp + amount;
        const newLevel = Math.floor(newXP / 100) + 1;

        set({
          profile: {
            ...profile,
            xp: newXP,
          },
        });

        // Log XP event
        import('../lib/events').then((m) => {
          m.logEvent('xp_earned', 'xp', undefined, { xpEarned: amount });
        });

        if (newLevel > oldLevel) {
          // Log level up event
          import('../lib/events').then((m) => {
            m.logEvent('level_up', 'levels', undefined, { level: newLevel });
          });

          get().showNotification({
            type: 'level',
            title: `Level Up!`,
            message: `Congratulations! You reached Level ${newLevel}!`,
          });
        }

        if (user) {
          await supabase
            .from('profiles')
            .update({
              xp: newXP,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);
        }
      },

      dataLoaded: false,
      setDataLoaded: (dataLoaded) => set({ dataLoaded }),

      splits: [],
      addSplitLocal: (split) => set((s) => ({ splits: [split, ...s.splits] })),
      removeSplitLocal: (id) => set((s) => ({ splits: s.splits.filter((sp) => sp.id !== id) })),
      setSplits: (splits) => set({ splits }),

      notifications: [],
      showNotification: (notification) => {
        const id = crypto.randomUUID();
        set((s) => ({
          notifications: [...s.notifications, { ...notification, id }].slice(-5),
        }));
      },
      dismissNotification: (id) =>
        set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

      events: [],
      setEvents: (events) => set({ events }),
      addEventLocal: (event) => set((s) => ({ events: [event, ...s.events] })),

      recurringExpenses: [],
      setRecurringExpenses: (recurringExpenses) => set({ recurringExpenses }),
      addRecurringExpenseLocal: (expense) => set((s) => ({ recurringExpenses: [expense, ...s.recurringExpenses] })),
      updateRecurringExpenseLocal: (id, updates) => set((s) => ({
        recurringExpenses: s.recurringExpenses.map((re) => re.id === id ? { ...re, ...updates } : re)
      })),
      removeRecurringExpenseLocal: (id) => set((s) => ({
        recurringExpenses: s.recurringExpenses.filter((re) => re.id !== id)
      })),

      preferences: defaultPreferences,
      updatePreferencesLocal: (updates) => set((s) => {
        const next = { ...s.preferences, ...updates };
        applyPreferencesToDOM(next);
        
        const timerUpdates: Partial<AppState> = {};
        if (updates.default_pomodoro !== undefined) timerUpdates.pomodoroMinutes = updates.default_pomodoro;
        if (updates.default_short_break !== undefined) timerUpdates.breakMinutes = updates.default_short_break;
        if (updates.default_long_break !== undefined) timerUpdates.longBreakMinutes = updates.default_long_break;

        return { preferences: next, ...timerUpdates };
      }),
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
        splits: state.splits,
        events: state.events,
        recurringExpenses: state.recurringExpenses,
        preferences: state.preferences,
      }),
    }
  )
);

// Supabase data operations
export const loadUserData = async (userId: string) => {
  const store = useStore.getState();

  const [expensesRes, tasksRes, sessionsRes, goalsRes, catsRes, profileRes, eventsRes, recurringRes, prefsRes] = await Promise.all([
    supabase.from('expenses').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('focus_sessions').select('*').eq('user_id', userId).order('session_date', { ascending: false }),
    supabase.from('savings_goals').select('*').eq('user_id', userId),
    supabase.from('custom_categories').select('*').eq('user_id', userId),
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('events').select('*').eq('user_id', userId).order('timestamp', { ascending: false }),
    supabase.from('recurring_expenses').select('*').eq('user_id', userId).order('payment_date', { ascending: true }),
    supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
  ]);

  if (expensesRes.data) store.setExpenses(expensesRes.data);
  if (tasksRes.data) store.setTasks(tasksRes.data);
  if (sessionsRes.data) store.setFocusSessions(sessionsRes.data);
  if (goalsRes.data) store.setSavingsGoals(goalsRes.data);
  if (catsRes.data) store.setCustomCategories(catsRes.data);
  if (eventsRes && eventsRes.data) {
    store.setEvents(eventsRes.data);
  } else if (eventsRes && eventsRes.error) {
    console.warn('Events table load failed, using local storage cache:', eventsRes.error.message);
  }
  if (recurringRes && recurringRes.data) {
    store.setRecurringExpenses(recurringRes.data);
  } else if (recurringRes && recurringRes.error) {
    console.warn('Recurring expenses load failed, using local storage cache:', recurringRes.error.message);
  }
  if (prefsRes && prefsRes.data) {
    store.updatePreferencesLocal(prefsRes.data);
  } else if (prefsRes && prefsRes.error) {
    console.warn('User preferences load failed, using local storage cache:', prefsRes.error.message);
  }
  if (profileRes.data) {
    store.updateProfile({
      xp: profileRes.data.xp,
      streak: profileRes.data.streak,
      last_active_date: profileRes.data.last_active_date,
      monthly_budget: profileRes.data.monthly_budget,
      total_savings: profileRes.data.total_savings,
      badges: profileRes.data.badges || [],
      display_name: profileRes.data.display_name,
      avatar_url: profileRes.data.avatar_url,
      daily_challenge_claims:
        profileRes.data.daily_challenge_claims || {
          date: '',
          claimed: [],
        },
    });
  }

  store.setDataLoaded(true);
};

export const saveProfile = async (userId: string, data: Partial<Profile>) => {
  await supabase.from('profiles').upsert({
    id: userId,
    ...data,
    updated_at: new Date().toISOString(),
  });
};
