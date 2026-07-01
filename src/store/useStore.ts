import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
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

export type Page = 'dashboard' | 'finance' | 'productivity' | 'analytics' | 'rewards' | 'splits';

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

        const newXP = profile.xp + amount;

        set({
          profile: {
            ...profile,
            xp: newXP,
          },
        });

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
      }),
    }
  )
);

// Supabase data operations
export const loadUserData = async (userId: string) => {
  const store = useStore.getState();

  const [expensesRes, tasksRes, sessionsRes, goalsRes, catsRes, profileRes] = await Promise.all([
    supabase.from('expenses').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('focus_sessions').select('*').eq('user_id', userId).order('session_date', { ascending: false }),
    supabase.from('savings_goals').select('*').eq('user_id', userId),
    supabase.from('custom_categories').select('*').eq('user_id', userId),
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
  ]);

  if (expensesRes.data) store.setExpenses(expensesRes.data);
  if (tasksRes.data) store.setTasks(tasksRes.data);
  if (sessionsRes.data) store.setFocusSessions(sessionsRes.data);
  if (goalsRes.data) store.setSavingsGoals(goalsRes.data);
  if (catsRes.data) store.setCustomCategories(catsRes.data);
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
