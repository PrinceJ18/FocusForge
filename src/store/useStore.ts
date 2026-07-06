import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { AppEvent } from '../lib/events';
import { format } from 'date-fns';
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
  recurring_expense_id?: string | null;
  recurring_occurrence_date?: string | null;
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
  user_id: string;
  title: string;
  description: string;
  priority: Priority;
  section_id: string | null;
  scheduled_date: string | null;
  deadline: string | null;
  has_no_end_date: boolean;
  reminder_enabled: boolean;
  reminder_time: string | null;
  recurrence_type: 'none' | 'daily' | 'weekly' | 'monthly' | 'weekdays' | 'custom';
  recurrence_interval: number | null;
  recurrence_weekdays: string[] | null;
  recurrence_end_date: string | null;
  completed: boolean;
  subject: string;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
  xp_awarded?: boolean;
}

export interface TaskSection {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TaskCompletion {
  id: string;
  user_id: string;
  task_id: string;
  occurrence_date: string;
  completed: boolean;
  completed_at: string;
  created_at: string;
  updated_at: string;
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

  // Task Sections
  taskSections: TaskSection[];
  setTaskSections: (sections: TaskSection[]) => void;
  addTaskSectionLocal: (section: TaskSection) => void;
  updateTaskSectionLocal: (id: string, updates: Partial<TaskSection>) => void;
  removeTaskSectionLocal: (id: string) => void;

  // Task Completions
  taskCompletions: TaskCompletion[];
  setTaskCompletions: (completions: TaskCompletion[]) => void;
  addTaskCompletionLocal: (completion: TaskCompletion) => void;
  removeTaskCompletionLocal: (taskId: string, occurrenceDate: string) => void;

  // Focus
  focusSessions: FocusSession[];
  setFocusSessions: (sessions: FocusSession[]) => void;
  addFocusSessionLocal: (session: FocusSession) => void;
  updateFocusSessionLocal: (id: string, updates: Partial<FocusSession>) => void;
  upsertFocusSessionLocal: (session: FocusSession) => void;

  // Timer state (not persisted to DB)
  timerSeconds: number;
  timerRunning: boolean;
  timerMode: TimerMode;
  pomodoroMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  sessionCount: number;
  timerDeadline: number | null;
  lastCompletedDeadline: number | null;
  timerRunDurationSeconds: number | null;
  timerOwnerId: string | null;
  userTimerStates: Record<string, { timerSeconds: number; timerRunning: boolean; timerMode: TimerMode; timerDeadline: number | null; lastCompletedDeadline: number | null; timerRunDurationSeconds: number | null }>;
  setTimerSeconds: (s: number) => void;
  setTimerRunning: (r: boolean) => void;
  setTimerMode: (m: TimerMode) => void;
  setPomodoroMinutes: (m: number) => void;
  incrementSessionCount: () => void;
  resetTimer: () => void;
  updateActiveUserTimerState: (updates: Partial<{ timerSeconds: number; timerRunning: boolean; timerMode: TimerMode; timerDeadline: number | null; lastCompletedDeadline: number | null; timerRunDurationSeconds: number | null }>) => void;
  syncUserTimerState: (userId: string | null) => void;

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
      setUser: (user) => {
        set({ user });
        get().syncUserTimerState(user?.id || null);
      },

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

      taskSections: [],
      setTaskSections: (taskSections) => set({ taskSections }),
      addTaskSectionLocal: (section) => set((s) => ({ taskSections: [...s.taskSections, section] })),
      updateTaskSectionLocal: (id, updates) =>
        set((s) => ({ taskSections: s.taskSections.map((ts) => ts.id === id ? { ...ts, ...updates } : ts) })),
      removeTaskSectionLocal: (id) => set((s) => ({ taskSections: s.taskSections.filter((ts) => ts.id !== id) })),

      taskCompletions: [],
      setTaskCompletions: (taskCompletions) => set({ taskCompletions }),
      addTaskCompletionLocal: (completion) => set((s) => ({ taskCompletions: [...s.taskCompletions, completion] })),
      removeTaskCompletionLocal: (taskId, occurrenceDate) =>
        set((s) => ({
          taskCompletions: s.taskCompletions.filter(
            (c) => !(c.task_id === taskId && c.occurrence_date === occurrenceDate)
          ),
        })),

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
      upsertFocusSessionLocal: (session) => set((s) => {
        const index = s.focusSessions.findIndex(
          (fs) => fs.id === session.id || fs.session_date === session.session_date
        );
        if (index >= 0) {
          const next = [...s.focusSessions];
          next[index] = session;
          return { focusSessions: next };
        } else {
          return { focusSessions: [session, ...s.focusSessions] };
        }
      }),

      timerSeconds: 25 * 60,
      timerRunning: false,
      timerMode: 'focus',
      pomodoroMinutes: 25,
      breakMinutes: 5,
      longBreakMinutes: 15,
      sessionCount: 0,
      timerDeadline: null,
      lastCompletedDeadline: null,
      timerRunDurationSeconds: null,
      timerOwnerId: null,
      userTimerStates: {},
      setTimerSeconds: (timerSeconds) => get().updateActiveUserTimerState({ timerSeconds }),
      setTimerRunning: (timerRunning) => get().updateActiveUserTimerState({ timerRunning }),
      setTimerMode: (timerMode) => get().updateActiveUserTimerState({ timerMode }),
      setPomodoroMinutes: (pomodoroMinutes) => {
        const clamped = isNaN(pomodoroMinutes) || pomodoroMinutes <= 0 ? 25 : Math.max(1, Math.min(120, pomodoroMinutes));
        set({ pomodoroMinutes: clamped });
      },
      incrementSessionCount: () => set((s) => ({ sessionCount: s.sessionCount + 1 })),
      resetTimer: () => {
        const { timerMode, pomodoroMinutes, breakMinutes, longBreakMinutes } = get();
        const seconds =
          timerMode === 'focus'
            ? pomodoroMinutes * 60
            : timerMode === 'break'
              ? breakMinutes * 60
              : longBreakMinutes * 60;
        get().updateActiveUserTimerState({ 
          timerSeconds: seconds, 
          timerRunning: false, 
          timerDeadline: null, 
          timerRunDurationSeconds: null 
        });
      },
      updateActiveUserTimerState: (updates) => {
        const { timerSeconds, timerRunning, timerMode, timerDeadline, lastCompletedDeadline, timerRunDurationSeconds, timerOwnerId, userTimerStates } = get();
        const ownerKey = timerOwnerId || 'anonymous';
        const nextActive = {
          timerSeconds: updates.timerSeconds !== undefined ? updates.timerSeconds : timerSeconds,
          timerRunning: updates.timerRunning !== undefined ? updates.timerRunning : timerRunning,
          timerMode: updates.timerMode !== undefined ? updates.timerMode : timerMode,
          timerDeadline: updates.timerDeadline !== undefined ? updates.timerDeadline : timerDeadline,
          lastCompletedDeadline: updates.lastCompletedDeadline !== undefined ? updates.lastCompletedDeadline : lastCompletedDeadline,
          timerRunDurationSeconds: updates.timerRunDurationSeconds !== undefined ? updates.timerRunDurationSeconds : timerRunDurationSeconds,
        };
        set({
          ...nextActive,
          userTimerStates: {
            ...userTimerStates,
            [ownerKey]: nextActive
          }
        });
      },
      syncUserTimerState: (userId) => {
        const key = userId || 'anonymous';
        const { timerSeconds, timerRunning, timerMode, timerDeadline, lastCompletedDeadline, timerRunDurationSeconds, userTimerStates, pomodoroMinutes } = get();
        const prevOwner = get().timerOwnerId || 'anonymous';
        const nextStates = {
          ...userTimerStates,
          [prevOwner]: {
            timerSeconds,
            timerRunning,
            timerMode,
            timerDeadline,
            lastCompletedDeadline,
            timerRunDurationSeconds
          }
        };
        const targetState = nextStates[key] || {
          timerSeconds: pomodoroMinutes * 60,
          timerRunning: false,
          timerMode: 'focus',
          timerDeadline: null,
          lastCompletedDeadline: null,
          timerRunDurationSeconds: null
        };
        set({
          timerSeconds: targetState.timerSeconds,
          timerRunning: targetState.timerRunning,
          timerMode: targetState.timerMode,
          timerDeadline: targetState.timerDeadline,
          lastCompletedDeadline: targetState.lastCompletedDeadline,
          timerRunDurationSeconds: targetState.timerRunDurationSeconds,
          timerOwnerId: key,
          userTimerStates: nextStates
        });
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

// Supabase data operations
export const loadUserData = async (userId: string) => {
  const store = useStore.getState();

  const [
    expensesRes, tasksRes, sessionsRes, goalsRes, catsRes, profileRes, eventsRes, recurringRes, prefsRes,
    sectionsRes, completionsRes
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
  ]);

  if (expensesRes.data) store.setExpenses(expensesRes.data);
  if (tasksRes.data) store.setTasks(tasksRes.data);
  if (sessionsRes.data) store.setFocusSessions(sessionsRes.data);
  if (goalsRes.data) store.setSavingsGoals(goalsRes.data);
  if (catsRes.data) store.setCustomCategories(catsRes.data);
  if (sectionsRes && sectionsRes.data) {
    store.setTaskSections(sectionsRes.data);
  } else if (sectionsRes && sectionsRes.error) {
    console.warn('Task sections load failed, using local storage cache:', sectionsRes.error.message);
  }
  if (completionsRes && completionsRes.data) {
    store.setTaskCompletions(completionsRes.data);
  } else if (completionsRes && completionsRes.error) {
    console.warn('Task completions load failed, using local storage cache:', completionsRes.error.message);
  }
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

export const fetchTasks = async (userId: string) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (data) useStore.getState().setTasks(data);
};

export const createTask = async (task: Omit<Task, 'user_id' | 'created_at' | 'updated_at'>, userId: string) => {
  const now = new Date().toISOString();
  const newTask: Task = {
    ...task,
    user_id: userId,
    created_at: now,
    updated_at: now,
  };
  useStore.getState().addTaskLocal(newTask);
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      id: newTask.id,
      user_id: userId,
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      section_id: newTask.section_id,
      scheduled_date: newTask.scheduled_date,
      deadline: newTask.deadline,
      has_no_end_date: newTask.has_no_end_date,
      reminder_enabled: newTask.reminder_enabled,
      reminder_time: newTask.reminder_time,
      recurrence_type: newTask.recurrence_type,
      recurrence_interval: newTask.recurrence_interval,
      recurrence_weekdays: newTask.recurrence_weekdays,
      recurrence_end_date: newTask.recurrence_end_date,
      completed: newTask.completed,
      subject: newTask.subject,
    })
    .select()
    .single();

  if (error) {
    useStore.getState().removeTaskLocal(newTask.id);
    throw error;
  }
  if (data) {
    useStore.getState().removeTaskLocal(newTask.id);
    useStore.getState().addTaskLocal(data);
  }
};

export const updateTask = async (id: string, updates: Partial<Task>) => {
  const store = useStore.getState();
  const original = store.tasks.find(t => t.id === id);
  const now = new Date().toISOString();

  store.updateTaskLocal(id, { ...updates, updated_at: now });

  const { error } = await supabase
    .from('tasks')
    .update({
      ...updates,
      updated_at: now,
    })
    .eq('id', id);

  if (error) {
    if (original) store.updateTaskLocal(id, original);
    throw error;
  }
};

export const deleteTask = async (id: string) => {
  const store = useStore.getState();
  const original = store.tasks.find(t => t.id === id);

  store.removeTaskLocal(id);

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) {
    if (original) store.addTaskLocal(original);
    throw error;
  }
};

export const completeTask = async (task: Task, date: Date, userId: string) => {
  const now = new Date().toISOString();
  const dateStr = format(date, 'yyyy-MM-dd');

  if (task.recurrence_type && task.recurrence_type !== 'none') {
    const newComp = {
      id: crypto.randomUUID(),
      user_id: userId,
      task_id: task.id,
      occurrence_date: dateStr,
      completed: true,
      completed_at: now,
      created_at: now,
      updated_at: now,
    };
    useStore.getState().addTaskCompletionLocal(newComp);

    const { error } = await supabase
      .from('task_completions')
      .insert(newComp);

    if (error) {
      useStore.getState().removeTaskCompletionLocal(task.id, dateStr);
      throw error;
    }
  } else {
    useStore.getState().updateTaskLocal(task.id, {
      completed: true,
      completed_at: now,
      updated_at: now,
    });

    const { error } = await supabase
      .from('tasks')
      .update({
        completed: true,
        completed_at: now,
        updated_at: now,
      })
      .eq('id', task.id);

    if (error) {
      useStore.getState().updateTaskLocal(task.id, {
        completed: false,
        completed_at: task.completed_at,
        updated_at: task.updated_at,
      });
      throw error;
    }
  }
};

export const uncompleteTask = async (task: Task, date: Date) => {
  const dateStr = format(date, 'yyyy-MM-dd');

  if (task.recurrence_type && task.recurrence_type !== 'none') {
    const store = useStore.getState();
    const originalCompletion = store.taskCompletions.find(
      c => c.task_id === task.id && c.occurrence_date === dateStr
    );

    store.removeTaskCompletionLocal(task.id, dateStr);

    const { error } = await supabase
      .from('task_completions')
      .delete()
      .eq('task_id', task.id)
      .eq('occurrence_date', dateStr);

    if (error) {
      if (originalCompletion) store.addTaskCompletionLocal(originalCompletion);
      throw error;
    }
  } else {
    const originalCompleted = task.completed;
    const originalCompletedAt = task.completed_at;
    const originalUpdatedAt = task.updated_at;
    const now = new Date().toISOString();

    useStore.getState().updateTaskLocal(task.id, {
      completed: false,
      completed_at: null,
      updated_at: now,
    });

    const { error } = await supabase
      .from('tasks')
      .update({
        completed: false,
        completed_at: null,
        updated_at: now,
      })
      .eq('id', task.id);

    if (error) {
      useStore.getState().updateTaskLocal(task.id, {
        completed: originalCompleted,
        completed_at: originalCompletedAt,
        updated_at: originalUpdatedAt,
      });
      throw error;
    }
  }
};

export const fetchTaskSections = async (userId: string) => {
  const { data, error } = await supabase
    .from('task_sections')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  if (data) useStore.getState().setTaskSections(data);
};

export const createTaskSection = async (
  section: Omit<TaskSection, 'user_id' | 'created_at' | 'updated_at'>,
  userId: string
) => {
  const now = new Date().toISOString();
  const newSection: TaskSection = {
    ...section,
    user_id: userId,
    created_at: now,
    updated_at: now,
  };
  useStore.getState().addTaskSectionLocal(newSection);

  const { data, error } = await supabase
    .from('task_sections')
    .insert({
      id: newSection.id,
      user_id: userId,
      name: newSection.name,
      icon: newSection.icon,
      color: newSection.color,
      sort_order: newSection.sort_order,
    })
    .select()
    .single();

  if (error) {
    useStore.getState().removeTaskSectionLocal(newSection.id);
    throw error;
  }
  if (data) {
    useStore.getState().removeTaskSectionLocal(newSection.id);
    useStore.getState().addTaskSectionLocal(data);
  }
};

export const updateTaskSection = async (id: string, updates: Partial<TaskSection>) => {
  const store = useStore.getState();
  const original = store.taskSections.find(s => s.id === id);
  const now = new Date().toISOString();

  store.updateTaskSectionLocal(id, { ...updates, updated_at: now });

  const { error } = await supabase
    .from('task_sections')
    .update({
      ...updates,
      updated_at: now,
    })
    .eq('id', id);

  if (error) {
    if (original) store.updateTaskSectionLocal(id, original);
    throw error;
  }
};

export const deleteTaskSection = async (id: string) => {
  const store = useStore.getState();
  const original = store.taskSections.find(s => s.id === id);
  
  // Back up tasks matching this section in case of rollback
  const affectedTasks = store.tasks.filter(t => t.section_id === id);

  store.removeTaskSectionLocal(id);
  // Locally update tasks to clear the section_id
  affectedTasks.forEach(t => store.updateTaskLocal(t.id, { section_id: null }));

  const { error } = await supabase
    .from('task_sections')
    .delete()
    .eq('id', id);

  if (error) {
    if (original) store.addTaskSectionLocal(original);
    affectedTasks.forEach(t => store.updateTaskLocal(t.id, { section_id: id }));
    throw error;
  }
};
