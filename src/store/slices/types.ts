import { User } from '@supabase/supabase-js';
import type { AppEvent } from '../../lib/events';

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
  notify_arena_champion: boolean;
  notify_arena_personal_best: boolean;
  notify_arena_rank_up: boolean;
  notify_arena_activity: boolean;
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
  status: 'pending' | 'completed' | 'wont_do';
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
  status: 'pending' | 'completed' | 'wont_do';
  completed_at: string;
  xp_awarded: boolean;
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
  friend_code?: string;
  daily_challenge_claims?: {
    date: string;
    claimed: string[];
  };
}

export type Page = 'dashboard' | 'finance' | 'productivity' | 'analytics' | 'splits' | 'reports' | 'achievements' | 'settings' | 'friends' | 'arena' | 'arena-activity' | 'arena-hall-of-fame';

export type NotificationType = 'xp' | 'level' | 'badge' | 'challenge' | 'achievement' | 'goal' | 'success' | 'error' | 'info';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  xp?: number;
}

export type Split = { id: string; name: string; amount: number; type: 'owe' | 'owed'; date: string; settled: boolean };

export interface AuthSlice {
  user: User | null;
  profile: Profile;
  setUser: (user: User | null) => void;
  updateProfile: (updates: Partial<Profile>) => void;
  addXP: (amount: number) => Promise<void>;
  setProfileXPAuthoritative: (totalXP: number) => void;
}

export interface NavigationSlice {
  currentPage: Page;
  setPage: (page: Page) => void;
}

export interface FinanceSlice {
  expenses: Expense[];
  savingsGoals: SavingsGoal[];
  customCategories: CustomCategory[];
  recurringExpenses: RecurringExpense[];
  splits: Split[];
  
  setExpenses: (expenses: Expense[]) => void;
  setSavingsGoals: (goals: SavingsGoal[]) => void;
  setCustomCategories: (cats: CustomCategory[]) => void;
  setRecurringExpenses: (expenses: RecurringExpense[]) => void;
  setSplits: (splits: Split[]) => void;

  addExpenseLocal: (expense: Expense) => void;
  removeExpenseLocal: (id: string) => void;
  addRecurringExpenseLocal: (expense: RecurringExpense) => void;
  updateRecurringExpenseLocal: (id: string, updates: Partial<RecurringExpense>) => void;
  removeRecurringExpenseLocal: (id: string) => void;
  addSplitLocal: (split: Split) => void;
  removeSplitLocal: (id: string) => void;
}

export interface ProductivitySlice {
  tasks: Task[];
  taskSections: TaskSection[];
  taskCompletions: TaskCompletion[];
  
  setTasks: (tasks: Task[]) => void;
  setTaskSections: (sections: TaskSection[]) => void;
  setTaskCompletions: (completions: TaskCompletion[]) => void;
  
  addTaskLocal: (task: Task) => void;
  updateTaskLocal: (id: string, updates: Partial<Task>) => void;
  removeTaskLocal: (id: string) => void;
  
  addTaskSectionLocal: (section: TaskSection) => void;
  updateTaskSectionLocal: (id: string, updates: Partial<TaskSection>) => void;
  removeTaskSectionLocal: (id: string) => void;
  
  addTaskCompletionLocal: (completion: TaskCompletion) => void;
  removeTaskCompletionLocal: (taskId: string, occurrenceDate: string) => void;
}

export interface FocusSlice {
  focusSessions: FocusSession[];
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
  
  setFocusSessions: (sessions: FocusSession[]) => void;
  addFocusSessionLocal: (session: FocusSession) => void;
  updateFocusSessionLocal: (id: string, updates: Partial<FocusSession>) => void;
  upsertFocusSessionLocal: (session: FocusSession) => void;
  
  setTimerSeconds: (s: number) => void;
  setTimerRunning: (r: boolean) => void;
  setTimerMode: (m: TimerMode) => void;
  setPomodoroMinutes: (m: number) => void;
  incrementSessionCount: () => void;
  resetTimer: () => void;
  updateActiveUserTimerState: (updates: Partial<{ timerSeconds: number; timerRunning: boolean; timerMode: TimerMode; timerDeadline: number | null; lastCompletedDeadline: number | null; timerRunDurationSeconds: number | null }>) => void;
  syncUserTimerState: (userId: string | null) => void;
}

export interface SettingsSlice {
  preferences: UserPreferences;
  updatePreferencesLocal: (updates: Partial<UserPreferences>) => void;
}

export interface EventsSlice {
  notifications: AppNotification[];
  events: AppEvent[];
  
  showNotification: (notification: Omit<AppNotification, 'id'>) => void;
  dismissNotification: (id: string) => void;
  setEvents: (events: AppEvent[]) => void;
  addEventLocal: (event: AppEvent) => void;
}

export interface GlobalSlice {
  dataLoaded: boolean;
  setDataLoaded: (loaded: boolean) => void;
}

export type AppState = AuthSlice & NavigationSlice & FinanceSlice & ProductivitySlice & FocusSlice & SettingsSlice & EventsSlice & GlobalSlice;
