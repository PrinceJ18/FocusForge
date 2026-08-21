import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  Wallet, Brain, AlertTriangle, Sparkles, Timer, TrendingUp, Target,
  CheckSquare, Zap, ArrowUpRight, ArrowDownRight, Clock, Star,
  Award, Play, Pause, RotateCcw, Plus, Calendar, Bell, ChevronUp, ChevronDown, Eye, EyeOff, Pin, X, List,
  PiggyBank, BarChart3, Lightbulb, Activity, Flame, Heart, Shield, SlidersHorizontal,
  type LucideIcon
} from 'lucide-react';
import { useStore, type Page, type Task, completeTask, uncompleteTask, deleteTask, updateTask, markTaskWontDo } from '../store/useStore';
import { useDailyGoalsStore } from '../store/useDailyGoalsStore';
import { format, parseISO, isToday, differenceInDays } from 'date-fns';
import { formatCurrency } from '../lib/formatCurrency';
import { formatFocusTime } from '../lib/formatUtils';
import { getLevelInfo } from '../lib/levels';
import { calculateDashboardStatistics } from '../lib/statistics';
import { calculateProductivityScore } from '../lib/scoreUtils';
import { generateInsights } from '../lib/insightUtils';
import InsightCard from '../components/analytics/InsightCard';
import TrendChart from '../components/analytics/TrendChart';
import { payRecurringExpense } from '../lib/recurringUtils';
import { supabase } from '../lib/supabase';
import { logEvent } from '../lib/events';
import { useDailyProductivityScore } from '../hooks/useDailyProductivityScore';
import { useFinancialHealthScore } from '../hooks/useFinancialHealthScore';

// Import statistics single-source-of-truth helpers
import {
  getTodayFocusMinutes,
  getTodayFocusSessions,
  getTodayCompletedTasks,
  getMonthlyCompletedTasks,
  getMonthlyExpensesAmount
} from '../lib/statsUtils';

// Import recurrence selectors
import { getTasksForDate } from '../lib/taskRecurrence';

// Import Reusable Task Components
import TaskDetailsModal from '../components/tasks/TaskDetailsModal';
import TaskFormModal from '../components/tasks/TaskFormModal';
import TodaysGoalsCard from '../components/TodaysGoalsCard';
import RecurringDetailsModal from '../components/finance/RecurringDetailsModal';
import { type RecurringExpense } from '../store/useStore';

// Import Dashboard Widget System
import DashboardWidget from '../components/dashboard/DashboardWidget';
import DashboardGrid from '../components/dashboard/DashboardGrid';
import KpiCard from '../components/dashboard/KpiCard';
import DashboardCustomizeDrawer from '../components/dashboard/DashboardCustomizeDrawer';
import { WIDGET_REGISTRY } from '../components/dashboard/dashboardWidgets';
import DashboardWidgetWrapper from '../components/dashboard/DashboardWidgetWrapper';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

type Priority = 'low' | 'medium' | 'high';

const getTaskXP = (priority: string) => {
  if (priority === 'high') return 20;
  if (priority === 'medium') return 10;
  return 5;
};

export default function Dashboard() {
  const {
    expenses, tasks, focusSessions, savingsGoals, profile, user, setPage,
    timerSeconds, timerRunning, timerMode, setTimerSeconds, setTimerRunning, setTimerMode,
    preferences, events, recurringExpenses, addExpenseLocal, addTaskLocal, updateTaskLocal, removeTaskLocal, removeRecurringExpenseLocal, addXP, taskCompletions, taskSections, updatePreferencesLocal, showNotification
  } = useStore();

  const [showQuickAddExpense, setShowQuickAddExpense] = useState(false);
  const [showQuickAddTask, setShowQuickAddTask] = useState(false);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Quick inputs
  const [quickExpenseName, setQuickExpenseName] = useState('');
  const [quickExpenseAmount, setQuickExpenseAmount] = useState('');
  const [quickTaskTitle, setQuickTaskTitle] = useState('');

  // Modals state
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<{ task: Task; status: 'pending' | 'completed' | 'wont_do'; date: string } | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedRecurringDetails, setSelectedRecurringDetails] = useState<RecurringExpense | null>(null);

  // Customization drawer state
  const [showCustomize, setShowCustomize] = useState(false);

  // Parse hidden widgets from preferences string
  const hiddenWidgets = useMemo(() => {
    const raw = preferences.dashboard_hidden_widgets || '';
    return new Set(raw.split(',').filter(Boolean));
  }, [preferences.dashboard_hidden_widgets]);

  const handleToggleWidget = useCallback((widgetId: string) => {
    const next = new Set(hiddenWidgets);
    if (next.has(widgetId)) {
      next.delete(widgetId);
    } else {
      next.add(widgetId);
    }
    const newValue = Array.from(next).join(',');
    updatePreferencesLocal({ dashboard_hidden_widgets: newValue });

    if (user) {
      const syncPref = async () => {
        try {
          await supabase.from('user_preferences').upsert({
            user_id: user.id,
            dashboard_hidden_widgets: newValue,
            updated_at: new Date().toISOString()
          });
        } catch (err) {
          console.warn('Failed to sync widget preferences to Supabase:', err);
        }
      };
      syncPref();
    }
  }, [hiddenWidgets, updatePreferencesLocal, user]);

  const handleResetWidgets = useCallback(() => {
    updatePreferencesLocal({ dashboard_hidden_widgets: '' });
    if (user) {
      const resetPref = async () => {
        try {
          await supabase.from('user_preferences').upsert({
            user_id: user.id,
            dashboard_hidden_widgets: '',
            updated_at: new Date().toISOString()
          });
        } catch (err) {
          console.warn('Failed to sync widget preferences to Supabase:', err);
        }
      };
      resetPref();
    }
  }, [updatePreferencesLocal, user]);

  // ----------------------------------------------------
  // STATISTICS & METRICS
  // ----------------------------------------------------
  const stats = useMemo(() => {
    return calculateDashboardStatistics({ expenses, tasks, focusSessions, savingsGoals, profile });
  }, [expenses, tasks, focusSessions, savingsGoals, profile]);

  // Time based greeting
  const greeting = useMemo(() => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good Morning';
    if (hours < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const displayName = profile.display_name || user?.email?.split('@')[0] || 'User';
  const levelInfo = getLevelInfo(profile.xp);

  // Estimated Time Left for daily goals
  const estimatedTimeLeft = useMemo(() => {
    const targetFocus = preferences.default_daily_focus_goal || 120;
    const spentFocus = getTodayFocusMinutes(focusSessions);
    return Math.max(0, targetFocus - spentFocus);
  }, [preferences, focusSessions]);

  const { score: productivityScore, label: prodLabel } = useDailyProductivityScore();

  const { score: financialScore, label: finLabel } = useFinancialHealthScore();

  const smartInsights = useMemo(() => {
    return generateInsights({ tasks, focusSessions, expenses });
  }, [tasks, focusSessions, expenses]);

  // Generate 7-day focus trend data for chart
  const focusTrendData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const mins = focusSessions
        .filter(s => s.session_date.startsWith(dateStr))
        .reduce((sum, s) => sum + s.minutes, 0);
      data.push({ name: format(d, 'EEE'), focus: mins });
    }
    return data;
  }, [focusSessions]);

  // Generate 7-day expense trend data for chart
  const expenseTrendData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const spent = expenses
        .filter(e => e.expense_date.startsWith(dateStr))
        .reduce((sum, e) => sum + e.amount, 0);
      data.push({ name: format(d, 'EEE'), spent });
    }
    return data;
  }, [expenses]);


  // Productivity Score Explanation
  const productivityScoreExplanation = useMemo(() => {
    let score = productivityScore;
    let desc = 'Calculated from focus minutes, task completion, daily streaks, budget health, and daily challenges.';
    let action = 'To improve, complete pending tasks, log focus sessions, and maintain a daily streak.';
    if (score >= 80) {
      action = 'Perfect alignment! Keep doing what you are doing.';
    } else if (score < 50) {
      action = 'Try starting a short break between focus sessions and clear overdue tasks.';
    }
    return { score, desc, action };
  }, [productivityScore]);

  // Achievements Preview
  const achievementsPreview = useMemo(() => {
    const unlocked = events.filter(e => e.type === 'achievement_unlocked');
    const latestAch = unlocked[0]?.metadata.achievementTitle || 'No achievements unlocked yet';
    const totalBadges = profile.badges?.length || 0;
    return { latestAch, totalBadges };
  }, [events, profile.badges]);

  const upcomingBills = useMemo(() => {
    return recurringExpenses
      .filter(r => r.status === 'active')
      .slice(0, 5);
  }, [recurringExpenses]);

  // Recent timeline events
  const recentEvents = useMemo(() => {
    return events.slice(0, 8);
  }, [events]);

  // Savings goal summary
  const savingsSummary = useMemo(() => {
    if (savingsGoals.length === 0) return null;
    // Pick the most-progressed active goal (not yet complete)
    const active = savingsGoals
      .filter(g => g.current_amount < g.target_amount)
      .sort((a, b) => (b.current_amount / b.target_amount) - (a.current_amount / a.target_amount));
    const goal = active[0] || savingsGoals[0];
    const remaining = Math.max(0, goal.target_amount - goal.current_amount);
    const pct = goal.target_amount > 0 ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100)) : 0;
    const totalSaved = savingsGoals.reduce((sum, g) => sum + g.current_amount, 0);
    const totalTarget = savingsGoals.reduce((sum, g) => sum + g.target_amount, 0);
    return { goal, remaining, pct, totalSaved, totalTarget, count: savingsGoals.length };
  }, [savingsGoals]);

  // Today's expenses amount
  const todayExpensesAmount = useMemo(() => {
    return expenses
      .filter(e => isToday(parseISO(e.expense_date)))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  // Quick Timer controllers
  const handleStartTimer = (mins: number) => {
    setTimerMode('focus');
    setTimerSeconds(mins * 60);
    setTimerRunning(true);
    setPage('productivity');
  };

  const handleToggleTimer = () => {
    setTimerRunning(!timerRunning);
  };

  // Quick Actions Calls
  const handleQuickAddExpense = async () => {
    const amt = parseFloat(quickExpenseAmount);
    if (quickExpenseName && !isNaN(amt)) {
      setIsSubmittingExpense(true);
      try {
        const newExp = {
          id: crypto.randomUUID(),
          user_id: user?.id || 'local',
          title: quickExpenseName,
          amount: amt,
          category: 'other',
          note: 'Quick logged expense from Command Center',
          expense_date: format(new Date(), 'yyyy-MM-dd'),
          created_at: new Date().toISOString(),
        };
        addExpenseLocal(newExp);
        if (user) {
          await supabase.from('expenses').insert({
            user_id: user.id,
            title: newExp.title,
            amount: newExp.amount,
            category: newExp.category,
            note: newExp.note,
            expense_date: newExp.expense_date,
          });
        }
        setQuickExpenseName('');
        setQuickExpenseAmount('');
        setShowQuickAddExpense(false);
        showNotification({ type: 'success', title: 'Expense Added', message: `Added ${formatCurrency(amt)} for ${quickExpenseName}` });
      } catch (error) {
        showNotification({ type: 'error', title: 'Error', message: 'Failed to add expense.' });
      } finally {
        setIsSubmittingExpense(false);
      }
    }
  };

  const handleQuickAddTask = async () => {
    if (quickTaskTitle) {
      setIsSubmittingTask(true);
      try {
        const now = new Date().toISOString();
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const newT = {
          id: crypto.randomUUID(),
          user_id: user?.id || 'local',
          title: quickTaskTitle,
          description: '',
          priority: 'medium' as const,
          section_id: null,
          scheduled_date: todayStr,
          deadline: null,
          has_no_end_date: false,
          reminder_enabled: false,
          reminder_time: null,
          recurrence_type: 'none' as const,
          recurrence_interval: null,
          recurrence_weekdays: null,
          recurrence_end_date: null,
          status: 'pending' as const,
          subject: 'Other',
          created_at: now,
          completed_at: null,
          updated_at: now,
        };
        addTaskLocal(newT);
        if (user) {
          await supabase.from('tasks').insert({
            id: newT.id,
            user_id: user.id,
            title: newT.title,
            description: newT.description,
            priority: newT.priority,
            section_id: newT.section_id,
            scheduled_date: newT.scheduled_date,
            deadline: newT.deadline,
            has_no_end_date: newT.has_no_end_date,
            reminder_enabled: newT.reminder_enabled,
            reminder_time: newT.reminder_time,
            recurrence_type: newT.recurrence_type,
            recurrence_interval: newT.recurrence_interval,
            recurrence_weekdays: newT.recurrence_weekdays,
            recurrence_end_date: newT.recurrence_end_date,
            status: newT.status,
            subject: newT.subject,
            created_at: newT.created_at,
            completed_at: newT.completed_at,
            updated_at: newT.updated_at,
          });
        }
        setQuickTaskTitle('');
        setShowQuickAddTask(false);
        showNotification({ type: 'success', title: 'Task Added', message: `Task "${quickTaskTitle}" created` });
      } catch (error) {
        showNotification({ type: 'error', title: 'Error', message: 'Failed to create task.' });
      } finally {
        setIsSubmittingTask(false);
      }
    }
  };

  // Toggle Task Completion Callback
  const handleToggleTask = async (task: Task, currentlyCompleted: boolean, dateStr: string) => {
    const date = parseISO(dateStr);

    try {
      if (currentlyCompleted) {
        await uncompleteTask(task, date, user?.id || 'local');
      } else {
        await completeTask(task, date, user?.id || 'local');
      }
    } catch (err: any) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
  };

  const handleDeleteTask = async (task: Task) => {
    await deleteTask(task.id);
    logEvent('task_deleted', 'tasks', task.id, {
      title: task.title,
      description: `Deleted task: ${task.title}`,
    });
  };

  const handleUpdateTask = async (taskData: any) => {
    if (!editingTask) return;
    await updateTask(editingTask.id, taskData);
    logEvent('task_updated', 'tasks', editingTask.id, {
      title: taskData.title,
      description: `Updated task: ${taskData.title}`,
    });
    setEditingTask(null);
  };

  // ----------------------------------------------------
  // COMPUTED PROPERTIES
  // ----------------------------------------------------
  const todayDate = new Date();
  const todayStr = format(todayDate, 'yyyy-MM-dd');

  // Resolve today's task occurrences using the shared recurrence helper
  const todayTaskOccurrences = useMemo(() => {
    return getTasksForDate(tasks, todayDate, taskCompletions);
  }, [tasks, taskCompletions]);

  const todayCompletedCount = getTodayCompletedTasks(tasks);
  const monthlyCompletedCount = getMonthlyCompletedTasks(tasks);
  const monthlySpent = getMonthlyExpensesAmount(expenses);
  const budgetRemaining = profile.monthly_budget - monthlySpent;

  // -------------------------------------------------------
  // DAILY BRIEF — contextual summary sentences (Section 1)
  // -------------------------------------------------------
  const dailyBrief = useMemo(() => {
    const sentences: string[] = [];
    const todayMinutes = getTodayFocusMinutes(focusSessions);
    const targetFocus = preferences.default_daily_focus_goal || 120;
    const todayTasks = todayTaskOccurrences?.length ?? 0;
    const streak = profile.streak ?? 0;

    // Month-to-date spending
    const currentYear = todayDate.getFullYear();
    const currentMonth = todayDate.getMonth();
    const currentYearMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const monthExpenses = expenses.filter(e => e?.expense_date && e.expense_date.startsWith(currentYearMonthStr));
    const monthSpending = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Today's spending
    const todayExpenses = expenses.filter(e => {
      if (!e?.expense_date) return false;
      try { return isToday(parseISO(e.expense_date)); } catch { return false; }
    });
    const todaySpent = todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Calendar days remaining in this month INCLUDING today
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentDay = todayDate.getDate();
    const remainingDays = Math.max(1, daysInMonth - currentDay + 1);

    const monthlyBudget = profile.monthly_budget || 0;
    const remainingBudget = Math.max(0, monthlyBudget - monthSpending);
    const dailySpendingAllowance = monthlyBudget > 0 && remainingDays > 0 ? Math.round(remainingBudget / remainingDays) : 0;
    const remainingSafeSpendingToday = Math.max(0, dailySpendingAllowance - todaySpent);

    // Task summary
    if (todayTasks > 0) {
      const pending = todayTasks - (todayCompletedCount ?? 0);
      if (pending > 0) {
        sentences.push(`You have ${pending} task${pending !== 1 ? 's' : ''} remaining today.`);
      } else {
        sentences.push('All tasks completed today! 🎉');
      }
    }

    // Focus summary
    const focusRemaining = Math.max(0, targetFocus - todayMinutes);
    if (focusRemaining > 0) {
      sentences.push(`${formatFocusTime(focusRemaining)} away from today's focus goal.`);
    } else {
      sentences.push('Focus goal reached for today! ✨');
    }

    // Budget summary — Smart Daily Spending (Phase 3.9.1 Task 2)
    if (monthlyBudget > 0) {
      if (dailySpendingAllowance > 0 && todaySpent < dailySpendingAllowance) {
        sentences.push(`${formatCurrency(remainingSafeSpendingToday)} remaining in today's allowance.`);
      } else if (todaySpent >= dailySpendingAllowance && dailySpendingAllowance > 0) {
        sentences.push(`Daily allowance reached — ${formatCurrency(todaySpent - dailySpendingAllowance)} over today's safe limit.`);
      } else {
        sentences.push('Monthly budget exhausted — consider pausing spending.');
      }
    }

    // Streak summary
    if (streak >= 7) {
      sentences.push(`${streak}-day streak — you're on fire! 🔥`);
    } else if (streak >= 3) {
      sentences.push(`${streak}-day streak — keep building momentum!`);
    } else if (streak === 0) {
      sentences.push('Start your streak today with a focus session.');
    }

    return sentences;
  }, [focusSessions, preferences, profile, expenses, todayDate, todayTaskOccurrences, todayCompletedCount]);

  // -------------------------------------------------------
  // DAILY PROGRESS — percentages for composite ring (Section 3)
  // -------------------------------------------------------
  const dailyProgress = useMemo(() => {
    const todayMinutes = getTodayFocusMinutes(focusSessions);
    const targetFocus = preferences.default_daily_focus_goal || 120;
    const todayTasks = todayTaskOccurrences?.length ?? 0;
    const completedTasks = todayCompletedCount ?? 0;
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const dailyBudget = profile.monthly_budget > 0 ? Math.round(profile.monthly_budget / daysInMonth) : 0;
    const todaySpent = expenses.filter(e => isToday(parseISO(e.expense_date))).reduce((sum, e) => sum + e.amount, 0);

    const focusPct = targetFocus > 0 ? Math.min(100, Math.round((todayMinutes / targetFocus) * 100)) : 0;
    const taskPct = todayTasks > 0 ? Math.min(100, Math.round((completedTasks / todayTasks) * 100)) : 100;
    const budgetPct = dailyBudget > 0 ? Math.min(100, Math.max(0, Math.round(((dailyBudget - todaySpent) / dailyBudget) * 100))) : 100;
    const streak = profile.streak ?? 0;

    // Overall is weighted average: Focus 30%, Tasks 30%, Budget 20%, Streak 20%
    const streakScore = Math.min(100, streak * 15); // 7 days = 100%
    const overall = Math.round(focusPct * 0.3 + taskPct * 0.3 + budgetPct * 0.2 + streakScore * 0.2);

    return {
      focus: { pct: focusPct, current: todayMinutes, target: targetFocus },
      tasks: { pct: taskPct, current: completedTasks, target: todayTasks },
      budget: { pct: budgetPct, spent: todaySpent, limit: dailyBudget },
      streak: { value: streak, score: streakScore },
      overall,
    };
  }, [focusSessions, preferences, todayTaskOccurrences, todayCompletedCount, profile, expenses]);

  // Synchronize persisted daily progress percentage (Phase 3.9.1 Task 3)
  useEffect(() => {
    const todayStr = format(todayDate, 'yyyy-MM-dd');
    useDailyGoalsStore.getState().saveDailyProgressPercentage(todayStr, dailyProgress.overall);
  }, [todayDate, dailyProgress.overall]);

  // -------------------------------------------------------
  // SMART RECOMMENDATIONS — premium cards (Section 5)
  // -------------------------------------------------------
  interface SmartRecommendation {
    icon: LucideIcon;
    title: string;
    action: string;
    color: string;
    priority: 'high' | 'medium' | 'low';
  }

  const smartRecommendations = useMemo((): SmartRecommendation[] => {
    const recs: SmartRecommendation[] = [];
    const pending = tasks.filter(t => t.status === 'pending').length;
    const todayMinutes = getTodayFocusMinutes(focusSessions);
    const targetFocus = preferences.default_daily_focus_goal || 120;
    const todayExpenses = expenses.filter(e => isToday(parseISO(e.expense_date))).reduce((sum, e) => sum + e.amount, 0);
    const streak = profile.streak ?? 0;
    const xpToNext = getLevelInfo(profile.xp).xpToNext;

    // High priority: overdue tasks
    const overdue = tasks.filter(t => t.status === 'pending' && t.deadline && new Date(t.deadline) < new Date());
    if (overdue.length > 0) {
      recs.push({ icon: AlertTriangle, title: `${overdue.length} overdue task${overdue.length !== 1 ? 's' : ''}`, action: 'Review and clear overdue items', color: '#ef4444', priority: 'high' });
    }

    // Focus recommendation
    if (todayMinutes < targetFocus) {
      const remaining = targetFocus - todayMinutes;
      recs.push({ icon: Timer, title: `${formatFocusTime(remaining)} to focus goal`, action: 'Start a Pomodoro session', color: '#a855f7', priority: remaining > targetFocus * 0.5 ? 'high' : 'medium' });
    }

    // Task recommendation
    if (pending > 0) {
      recs.push({ icon: CheckSquare, title: `${pending} pending task${pending !== 1 ? 's' : ''}`, action: `Complete ${Math.min(3, pending)} tasks to boost your score`, color: '#06b6d4', priority: pending > 5 ? 'high' : 'medium' });
    }

    // Budget warning
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const dailyBudget = profile.monthly_budget > 0 ? Math.round(profile.monthly_budget / daysInMonth) : 0;
    if (dailyBudget > 0 && todayExpenses > dailyBudget * 0.8) {
      recs.push({ icon: Wallet, title: 'Budget caution', action: 'You\'ve used 80%+ of today\'s daily limit', color: '#f59e0b', priority: todayExpenses > dailyBudget ? 'high' : 'medium' });
    }

    // XP / Level up
    if (xpToNext <= 30) {
      recs.push({ icon: Zap, title: `${xpToNext} XP to level up!`, action: 'Complete a few tasks to level up', color: '#ec4899', priority: 'medium' });
    }

    // Streak encouragement
    if (streak === 0) {
      recs.push({ icon: Flame, title: 'Start your streak', action: 'Log a focus session to begin', color: '#f59e0b', priority: 'low' });
    }

    // Fallback
    if (recs.length === 0) {
      recs.push({ icon: Star, title: 'You\'re doing great!', action: 'Maintain your streak and check analytics', color: '#10b981', priority: 'low' });
    }

    return recs.slice(0, 4);
  }, [tasks, focusSessions, expenses, profile, preferences]);

  // -------------------------------------------------------
  // QUICK CONTINUE — resume items (Section 6)
  // -------------------------------------------------------
  const quickContinueItems = useMemo(() => {
    const items: Array<{ icon: LucideIcon; label: string; sublabel: string; page: Page; color: string }> = [];

    // Last incomplete high-priority task
    const highPriPending = tasks.find(t => t.status === 'pending' && t.priority === 'high');
    if (highPriPending) {
      items.push({ icon: CheckSquare, label: highPriPending.title, sublabel: 'High priority task', page: 'productivity', color: '#ef4444' });
    }

    // Most recent focus session — suggest continuing
    const lastSession = focusSessions.length > 0 ? focusSessions[0] : null;
    if (lastSession) {
      items.push({ icon: Timer, label: `Continue Focus`, sublabel: `Last: ${formatFocusTime(lastSession.minutes)} session`, page: 'productivity', color: '#a855f7' });
    }

    // Savings goal in progress
    if (savingsSummary && savingsSummary.pct < 100) {
      items.push({ icon: PiggyBank, label: savingsSummary.goal.title, sublabel: `${savingsSummary.pct}% saved`, page: 'finance', color: '#10b981' });
    }

    // Analytics
    if (items.length < 3) {
      items.push({ icon: BarChart3, label: 'Review Analytics', sublabel: 'Check your weekly trends', page: 'analytics', color: '#06b6d4' });
    }

    return items.slice(0, 3);
  }, [tasks, focusSessions, savingsSummary]);

  // -------------------------------------------------------
  // GOAL TRACKER — multi-goal progress (Section 4)
  // -------------------------------------------------------
  const goalTrackerData = useMemo(() => {
    const todayMinutes = getTodayFocusMinutes(focusSessions);
    const targetFocus = preferences.default_daily_focus_goal || 120;
    const todayTasks = todayTaskOccurrences?.length ?? 0;
    const completedTasks = todayCompletedCount ?? 0;
    const streak = profile.streak ?? 0;
    const longestStreak = Math.max(streak, profile.streak ?? 0);

    return {
      focus: { current: todayMinutes, target: targetFocus, label: 'Daily Focus', color: '#a855f7', icon: Timer },
      tasks: { current: completedTasks, target: todayTasks, label: 'Tasks Today', color: '#06b6d4', icon: CheckSquare },
      budget: {
        current: getMonthlyExpensesAmount(expenses),
        target: profile.monthly_budget || 0,
        label: 'Monthly Budget',
        color: '#ec4899',
        icon: Wallet,
        isInverse: true,
      },
      savings: savingsSummary ? {
        current: savingsSummary.goal.current_amount,
        target: savingsSummary.goal.target_amount,
        label: savingsSummary.goal.title,
        color: '#10b981',
        icon: PiggyBank,
      } : null,
      streak: { current: streak, longest: longestStreak, label: 'Day Streak', color: '#f59e0b', icon: Flame },
    };
  }, [focusSessions, preferences, todayTaskOccurrences, todayCompletedCount, profile, expenses, savingsSummary]);

  // Legacy recommendations (kept for backward compat)
  const recommendations = useMemo(() => {
    return smartRecommendations.map(r => r.action);
  }, [smartRecommendations]);

  // Score color helpers
  const getScoreColor = useCallback((score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  }, []);

  const widgetContext = useMemo(() => ({
    profile, user, stats, greeting, displayName, levelInfo, estimatedTimeLeft,
    productivityScore, prodLabel, financialScore, finLabel, smartInsights,
    focusTrendData, expenseTrendData, recommendations, productivityScoreExplanation,
    achievementsPreview, upcomingBills, recentEvents, savingsSummary, todayExpensesAmount,
    budgetRemaining, todayCompletedCount, todayTaskOccurrences, todayDate, preferences, taskSections,
    // Phase 3.7 additions
    dailyBrief, dailyProgress, smartRecommendations, quickContinueItems, goalTrackerData,
    // Actions
    setShowCustomize, setPage, setShowQuickAddTask, setShowQuickAddExpense,
    handleStartTimer, handleToggleTask, setSelectedTaskDetails, getScoreColor
  }), [
    profile, user, stats, greeting, displayName, levelInfo, estimatedTimeLeft,
    productivityScore, prodLabel, financialScore, finLabel, smartInsights,
    focusTrendData, expenseTrendData, recommendations, productivityScoreExplanation,
    achievementsPreview, upcomingBills, recentEvents, savingsSummary, todayExpensesAmount,
    budgetRemaining, todayCompletedCount, todayTaskOccurrences, todayDate, preferences, taskSections,
    dailyBrief, dailyProgress, smartRecommendations, quickContinueItems, goalTrackerData,
    setShowCustomize, setPage, setShowQuickAddTask, setShowQuickAddExpense,
    handleStartTimer, handleToggleTask, setSelectedTaskDetails, getScoreColor
  ]);

  return (
    <div className="page-enter pb-12 text-left">
      <DashboardGrid>
        {WIDGET_REGISTRY
          .filter(config => !hiddenWidgets.has(config.id))
          .sort((a, b) => a.defaultOrder - b.defaultOrder)
          .map(config => {
            const layout = { id: config.id, x: 0, y: 0, width: config.defaultSize.w, height: config.defaultSize.h, visible: true };
            return (
              <DashboardWidgetWrapper
                key={config.id}
                id={config.id}
                title={config.title}
                icon={config.icon}
                size={config.defaultSize}
                visible={true}
              >
                <config.component context={widgetContext} layout={layout} />
              </DashboardWidgetWrapper>
            );
          })
        }

      </DashboardGrid>

      {/* ============================================================
          MODALS & FORM POPUPS
          ============================================================ */}
      <Modal
        isOpen={showQuickAddExpense}
        onClose={() => setShowQuickAddExpense(false)}
        title="Quick Add Expense"
        maxWidth="sm"
        footer={
          <Button onClick={handleQuickAddExpense} isLoading={isSubmittingExpense} className="w-full">
            Add Expense
          </Button>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Expense Description</label>
            <input
              type="text"
              placeholder="e.g. Coffee, Books"
              value={quickExpenseName}
              onChange={(e) => setQuickExpenseName(e.target.value)}
              className="input-glass w-full px-3.5 py-2.5"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Amount ($)</label>
            <input
              type="number"
              placeholder="0.00"
              value={quickExpenseAmount}
              onChange={(e) => setQuickExpenseAmount(e.target.value)}
              className="input-glass w-full px-3.5 py-2.5"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showQuickAddTask}
        onClose={() => setShowQuickAddTask(false)}
        title="Quick Add Task"
        maxWidth="sm"
        footer={
          <Button onClick={handleQuickAddTask} isLoading={isSubmittingTask} className="w-full">
            Create Task
          </Button>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Task Title</label>
            <input
              type="text"
              placeholder="Enter task title..."
              value={quickTaskTitle}
              onChange={(e) => setQuickTaskTitle(e.target.value)}
              className="input-glass w-full px-3.5 py-2.5"
            />
          </div>
        </div>
      </Modal>

      {/* Task Details Modal sharing */}
      {selectedTaskDetails && (
        <TaskDetailsModal
          task={selectedTaskDetails.task}
          status={selectedTaskDetails.status}
          occurrenceDate={selectedTaskDetails.date}
          onClose={() => setSelectedTaskDetails(null)}
          onEdit={() => {
            const taskToEdit = selectedTaskDetails.task;
            setSelectedTaskDetails(null);
            setEditingTask(taskToEdit);
          }}
          onToggle={async () => {
            await handleToggleTask(
              selectedTaskDetails.task,
              selectedTaskDetails.status === 'completed',
              selectedTaskDetails.date
            );
            setSelectedTaskDetails((prev) =>
              prev ? { ...prev, status: prev.status === 'completed' ? 'pending' : 'completed' } : null
            );
          }}
          onWontDo={async () => {
            await markTaskWontDo(selectedTaskDetails.task, parseISO(selectedTaskDetails.date), user?.id || 'local');
            setSelectedTaskDetails((prev) =>
              prev ? { ...prev, status: 'wont_do' } : null
            );
          }}
          onDelete={async () => {
            await handleDeleteTask(selectedTaskDetails.task);
            setSelectedTaskDetails(null);
          }}
        />
      )}

      {editingTask && (
        <TaskFormModal
          initialTask={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={async (taskData) => {
            await handleUpdateTask(taskData);
          }}
        />
      )}

      {selectedRecurringDetails && (
        <RecurringDetailsModal
          bill={selectedRecurringDetails}
          onClose={() => setSelectedRecurringDetails(null)}
          onEdit={() => {
            setSelectedRecurringDetails(null);
            setPage('finance');
          }}
          onDelete={async () => {
            removeRecurringExpenseLocal(selectedRecurringDetails.id);
            if (user) {
              await supabase.from('recurring_expenses').delete().eq('id', selectedRecurringDetails.id);
            }
            setSelectedRecurringDetails(null);
          }}
        />
      )}

      {/* Dashboard Customization Drawer */}
      <DashboardCustomizeDrawer
        open={showCustomize}
        onClose={() => setShowCustomize(false)}
        hiddenWidgets={hiddenWidgets}
        onToggleWidget={handleToggleWidget}
        onReset={handleResetWidgets}
      />
    </div>
  );
}
