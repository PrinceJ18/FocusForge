import React, { useMemo, useState } from 'react';
import {
  Wallet, Brain, AlertTriangle, Sparkles, Timer, TrendingUp, Target,
  CheckSquare, Zap, ArrowUpRight, ArrowDownRight, Clock, Star,
  Award, Play, Pause, RotateCcw, Plus, Calendar, Bell, ChevronUp, ChevronDown, Eye, EyeOff, Pin, X, List,
  PiggyBank, BarChart3, Lightbulb, Activity
} from 'lucide-react';
import { useStore, type Page, type Task, completeTask, uncompleteTask, deleteTask, updateTask } from '../store/useStore';
import { format, parseISO, isToday, differenceInDays } from 'date-fns';
import { formatCurrency } from '../lib/formatCurrency';
import { getLevelInfo } from '../lib/levels';
import { calculateDashboardStatistics } from '../lib/statistics';
import { calculateProductivityScore, calculateFinancialHealthScore } from '../lib/scoreUtils';
import { generateInsights } from '../lib/insightUtils';
import InsightCard from '../components/analytics/InsightCard';
import TrendChart from '../components/analytics/TrendChart';
import { payRecurringExpense } from '../lib/recurringUtils';
import { supabase } from '../lib/supabase';
import { logEvent } from '../lib/events';

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
    preferences, events, recurringExpenses, addExpenseLocal, addTaskLocal, updateTaskLocal, removeTaskLocal, removeRecurringExpenseLocal, addXP, taskCompletions, taskSections
  } = useStore();

  const [showQuickAddExpense, setShowQuickAddExpense] = useState(false);
  const [showQuickAddTask, setShowQuickAddTask] = useState(false);

  // Quick inputs
  const [quickExpenseName, setQuickExpenseName] = useState('');
  const [quickExpenseAmount, setQuickExpenseAmount] = useState('');
  const [quickTaskTitle, setQuickTaskTitle] = useState('');

  // Modals state
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<{ task: Task; completed: boolean; date: string } | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedRecurringDetails, setSelectedRecurringDetails] = useState<RecurringExpense | null>(null);

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

  const { score: productivityScore, label: prodLabel } = useMemo(() => 
    calculateProductivityScore({ tasks, focusSessions, profile }),
  [tasks, focusSessions, profile]);

  const { score: financialScore, label: finLabel } = useMemo(() => 
    calculateFinancialHealthScore({ expenses, savingsGoals, monthlyBudget: profile.monthly_budget }),
  [expenses, savingsGoals, profile.monthly_budget]);

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

  // Recommendations Engine
  const recommendations = useMemo(() => {
    const list: string[] = [];
    const pending = tasks.filter(t => !t.completed).length;
    const todayMinutes = getTodayFocusMinutes(focusSessions);

    if (pending > 0) {
      list.push(`Finish ${Math.min(2, pending)} pending tasks to clear your workspace.`);
    }
    if (todayMinutes < (preferences.default_daily_focus_goal || 120)) {
      list.push('Complete one more Pomodoro session to hit your focus goals.');
    }
    const todayExpenses = expenses.filter(e => isToday(parseISO(e.expense_date))).reduce((sum, e) => sum + e.amount, 0);
    if (todayExpenses > 500) {
      list.push('Spend less than ₹200 tomorrow to balance your daily budget.');
    }
    if (profile.xp % 100 > 80) {
      list.push('Earn 20 more XP by completing tasks to level up today!');
    }

    if (list.length === 0) {
      list.push('Maintain your daily active streak by logging focus sessions.');
      list.push('Review your weekly analytics reports to analyze trends.');
    }

    return list;
  }, [tasks, focusSessions, expenses, profile.xp, preferences]);

  // Productivity Score Explanation
  const productivityScoreExplanation = useMemo(() => {
    let score = Math.round(stats.productivityScore || 70);
    let desc = 'Calculated from focus minutes completed, task ratio, and budget adherence.';
    let action = 'To improve, complete pending tasks and maintain a daily streak.';
    if (score >= 80) {
      action = 'Perfect alignment! Keep doing what you are doing.';
    } else if (score < 50) {
      action = 'Try starting a short break between focus sessions and clear overdue tasks.';
    }
    return { score, desc, action };
  }, [stats.productivityScore]);

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
    }
  };

  const handleQuickAddTask = async () => {
    if (quickTaskTitle) {
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
        completed: false,
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
          completed: newT.completed,
          subject: newT.subject,
          created_at: newT.created_at,
          completed_at: newT.completed_at,
          updated_at: newT.updated_at,
        });
      }
      setQuickTaskTitle('');
      setShowQuickAddTask(false);
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

  // Score color helpers
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="page-enter pb-12 text-left">
      <DashboardGrid>

        {/* ============================================================
            SECTION 1 — HERO
            Dashboard summary: welcome, avatar, level, XP, streak, scores
            ============================================================ */}
        <DashboardWidget
          icon={Sparkles}
          title="Dashboard"
          badge={format(todayDate, 'EEE, MMM d')}
          size="hero"
          colSpan={12}
          gradient="linear-gradient(135deg, rgba(168,85,247,0.12), rgba(236,72,153,0.06), rgba(6,182,212,0.05))"
          iconBg="rgba(168,85,247,0.2)"
          iconColor="#a855f7"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left: Greeting */}
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl font-black"
                style={{
                  background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                  boxShadow: '0 0 24px rgba(168,85,247,0.3)',
                  color: 'white',
                }}
              >
                {(profile.avatar_url)
                  ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full rounded-2xl object-cover" />
                  : displayName.charAt(0).toUpperCase()
                }
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>
                  {greeting}, {displayName}!
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Level {levelInfo.level} • {profile.xp} XP
                </p>
              </div>
            </div>

            {/* Right: Key metrics row */}
            <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
              {/* XP Progress */}
              <div className="text-center">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">XP Progress</div>
                <div className="w-20 bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: `${levelInfo.progress}%`, transition: 'width 0.8s ease' }} />
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{levelInfo.progress}%</div>
              </div>

              {/* Streak */}
              <div className="text-center">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Streak</div>
                <div className="text-lg font-black text-amber-500" style={{ fontFamily: 'Space Grotesk' }}>🔥 {profile.streak}</div>
              </div>

              {/* Productivity Score */}
              <div className="text-center">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Productivity</div>
                <div className="text-lg font-black" style={{ color: getScoreColor(productivityScore), fontFamily: 'Space Grotesk' }}>{productivityScore}%</div>
                <div className="text-[9px] font-semibold" style={{ color: getScoreColor(productivityScore) }}>{prodLabel}</div>
              </div>

              {/* Financial Health Score */}
              <div className="text-center">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Financial</div>
                <div className="text-lg font-black" style={{ color: getScoreColor(financialScore), fontFamily: 'Space Grotesk' }}>{financialScore}%</div>
                <div className="text-[9px] font-semibold" style={{ color: getScoreColor(financialScore) }}>{finLabel}</div>
              </div>
            </div>
          </div>
        </DashboardWidget>

        {/* ============================================================
            SECTION 2 — TODAY'S SNAPSHOT (4 KPI widgets)
            ============================================================ */}
        <h2 className="dashboard-section-title">Today's Snapshot</h2>

        <DashboardWidget
          icon={Timer}
          title="Focus Today"
          size="kpi"
          colSpan={3}
          iconBg="rgba(168,85,247,0.12)"
          iconColor="#a855f7"
        >
          <span className="text-2xl font-black text-purple-400 block text-center" style={{ fontFamily: 'Space Grotesk' }}>
            {getTodayFocusMinutes(focusSessions)}m
          </span>
        </DashboardWidget>

        <DashboardWidget
          icon={CheckSquare}
          title="Tasks Today"
          size="kpi"
          colSpan={3}
          iconBg="rgba(6,182,212,0.12)"
          iconColor="#06b6d4"
        >
          <div className="text-center">
            <span className="text-2xl font-black text-cyan-400" style={{ fontFamily: 'Space Grotesk' }}>
              {todayCompletedCount}
            </span>
            <span className="text-sm text-slate-500 font-medium"> / {todayTaskOccurrences.length}</span>
          </div>
        </DashboardWidget>

        <DashboardWidget
          icon={Wallet}
          title="Expenses Today"
          size="kpi"
          colSpan={3}
          iconBg="rgba(236,72,153,0.12)"
          iconColor="#ec4899"
        >
          <span className="text-2xl font-black text-pink-400 block text-center" style={{ fontFamily: 'Space Grotesk' }}>
            {formatCurrency(todayExpensesAmount)}
          </span>
        </DashboardWidget>

        <DashboardWidget
          icon={Target}
          title="Budget Left"
          size="kpi"
          colSpan={3}
          iconBg={budgetRemaining >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'}
          iconColor={budgetRemaining >= 0 ? '#10b981' : '#ef4444'}
        >
          <span
            className="text-2xl font-black block text-center"
            style={{ fontFamily: 'Space Grotesk', color: budgetRemaining >= 0 ? '#10b981' : '#ef4444' }}
          >
            {formatCurrency(budgetRemaining)}
          </span>
        </DashboardWidget>

        {/* ============================================================
            SECTION 3 — QUICK ACTIONS
            ============================================================ */}
        <h2 className="dashboard-section-title">Quick Actions</h2>

        <DashboardWidget
          icon={Zap}
          title="Command Center"
          colSpan={12}
          iconBg="rgba(168,85,247,0.12)"
          iconColor="#a855f7"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => handleStartTimer(25)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-purple-500/8 border border-purple-500/15 hover:bg-purple-500/15 hover:border-purple-500/30 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play size={20} className="text-purple-400" />
              </div>
              <span className="text-xs font-bold text-purple-400">Start Focus</span>
            </button>

            <button
              onClick={() => setShowQuickAddTask(true)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-cyan-500/8 border border-cyan-500/15 hover:bg-cyan-500/15 hover:border-cyan-500/30 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus size={20} className="text-cyan-400" />
              </div>
              <span className="text-xs font-bold text-cyan-400">Add Task</span>
            </button>

            <button
              onClick={() => setShowQuickAddExpense(true)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-pink-500/8 border border-pink-500/15 hover:bg-pink-500/15 hover:border-pink-500/30 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wallet size={20} className="text-pink-400" />
              </div>
              <span className="text-xs font-bold text-pink-400">Add Expense</span>
            </button>

            <button
              onClick={() => setPage('finance')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-500/8 border border-green-500/15 hover:bg-green-500/15 hover:border-green-500/30 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                <PiggyBank size={20} className="text-green-400" />
              </div>
              <span className="text-xs font-bold text-green-400">Savings Goal</span>
            </button>
          </div>
        </DashboardWidget>

        {/* ============================================================
            SECTION 4 — TODAY'S WORK
            Left: Today's Tasks | Right: Upcoming Bills
            ============================================================ */}
        <h2 className="dashboard-section-title">Today's Work</h2>

        {/* Today's Tasks */}
        <DashboardWidget
          icon={CheckSquare}
          title="Today's Tasks"
          badge={`${todayTaskOccurrences.length}`}
          size="large"
          colSpan={8}
          scrollable
          iconBg="rgba(168,85,247,0.12)"
          iconColor="#a855f7"
          headerAction={
            <div className="flex gap-2">
              <button
                onClick={() => setShowQuickAddTask(true)}
                className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 rounded-lg text-xs font-semibold"
              >
                Quick Add
              </button>
              <button
                onClick={() => setPage('productivity')}
                className="px-3 py-1.5 bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Manage Board
              </button>
            </div>
          }
        >
          <div className="space-y-2">
            {todayTaskOccurrences.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <CheckSquare size={32} className="mx-auto mb-2 opacity-35 text-gray-400" />
                <p className="text-xs">No tasks scheduled for today.</p>
                <button 
                  onClick={() => setShowQuickAddTask(true)}
                  className="text-[10px] text-purple-400 hover:text-purple-300 font-bold mt-2"
                >
                  + Create a Task
                </button>
              </div>
            ) : (
              todayTaskOccurrences.map(({ task, completed, occurrenceDate }) => {
                const section = taskSections.find((s) => s.id === task.section_id);
                const isHigh = task.priority === 'high';
                const isMed = task.priority === 'medium';
                const priorityColor = isHigh ? '#ef4444' : isMed ? '#f59e0b' : '#10b981';

                return (
                  <div
                    key={`${task.id}_${occurrenceDate}`}
                    onClick={() => setSelectedTaskDetails({ task, completed, date: occurrenceDate })}
                    className="p-3 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs"
                  >
                    {/* Checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTask(task, completed, occurrenceDate);
                      }}
                      className="text-gray-400 hover:text-white transition-colors"
                      style={{ color: completed ? '#10b981' : 'var(--text-muted)' }}
                    >
                      {completed ? (
                        <CheckSquare size={16} className="text-green-500" />
                      ) : (
                        <div className="w-4 h-4 rounded border border-white/20 hover:border-purple-400 transition-colors" />
                      )}
                    </button>

                    {/* Title & Info */}
                    <div className="flex-1 min-w-0 text-left">
                      <span 
                        className="font-semibold text-white block truncate"
                        style={{
                          textDecoration: completed ? 'line-through' : 'none',
                          color: completed ? 'rgba(255,255,255,0.4)' : 'white'
                        }}
                      >
                        {task.title}
                      </span>

                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span 
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                          style={{ backgroundColor: `${priorityColor}15`, color: priorityColor }}
                        >
                          {task.priority}
                        </span>
                        
                        {section && (
                          <span 
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: `${section.color}15`, color: section.color }}
                          >
                            {section.name}
                          </span>
                        )}

                        {task.recurrence_type && task.recurrence_type !== 'none' && (
                          <span className="text-[9px] text-purple-400 font-bold">Repeating</span>
                        )}

                        {task.reminder_enabled && (
                          <span className="text-[9px] text-teal-400 font-bold">🔔 {task.reminder_time || '9:00 AM'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DashboardWidget>

        {/* Upcoming Bills / Payments */}
        <DashboardWidget
          icon={Calendar}
          title="Upcoming Payments"
          badge={`${upcomingBills.length}`}
          size="large"
          colSpan={4}
          scrollable
          iconBg="rgba(245,158,11,0.12)"
          iconColor="#f59e0b"
          headerAction={
            <button
              onClick={() => setPage('finance')}
              className="px-3 py-1.5 bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
            >
              View All
            </button>
          }
        >
          <div className="space-y-2 text-xs">
            {upcomingBills.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <Calendar size={32} className="mx-auto mb-2 opacity-35 text-gray-400" />
                <p className="text-xs">No active bills scheduled.</p>
              </div>
            ) : (
              upcomingBills.map(b => (
                <div
                  key={b.id}
                  className="flex justify-between items-center p-3 bg-slate-950/40 border border-white/5 rounded-xl cursor-pointer hover:border-amber-500/20 hover:bg-white/[0.02] transition-all text-left"
                  onClick={() => setSelectedRecurringDetails(b)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <Wallet size={14} className="text-amber-400" />
                    </div>
                    <span className="text-slate-300 truncate font-medium">{b.name}</span>
                  </div>
                  <span className="text-sm text-amber-400 font-bold flex-shrink-0 ml-2">
                    {formatCurrency(b.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </DashboardWidget>

        {/* ============================================================
            SECTION 5 — ANALYTICS
            Focus Trend + Expense Trend (equal height charts)
            ============================================================ */}
        <h2 className="dashboard-section-title">Analytics</h2>

        <DashboardWidget
          icon={BarChart3}
          title="Focus Trend"
          badge="7 Days"
          size="medium"
          colSpan={6}
          iconBg="rgba(168,85,247,0.12)"
          iconColor="#a855f7"
        >
          <TrendChart data={focusTrendData} xKey="name" yKey="focus" color="#a855f7" height={200} />
        </DashboardWidget>

        <DashboardWidget
          icon={TrendingUp}
          title="Expense Trend"
          badge="7 Days"
          size="medium"
          colSpan={6}
          iconBg="rgba(236,72,153,0.12)"
          iconColor="#ec4899"
        >
          <TrendChart data={expenseTrendData} xKey="name" yKey="spent" color="#ec4899" height={200} />
        </DashboardWidget>

        {/* ============================================================
            SECTION 6 — INSIGHTS
            AI Insights + Recent Activity Timeline
            ============================================================ */}
        <h2 className="dashboard-section-title">Insights</h2>

        {/* AI Insights */}
        <DashboardWidget
          icon={Lightbulb}
          title="AI Insights"
          badge={`${smartInsights.length}`}
          size="medium"
          colSpan={6}
          iconBg="rgba(245,158,11,0.12)"
          iconColor="#f59e0b"
        >
          {smartInsights.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Lightbulb size={28} className="mx-auto mb-2 opacity-35" />
              <p className="text-xs">Log more activity to unlock personalized insights.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {smartInsights.map(insight => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          )}
        </DashboardWidget>

        {/* Recent Activity Timeline */}
        <DashboardWidget
          icon={Activity}
          title="Recent Activity"
          badge={`${recentEvents.length}`}
          size="medium"
          colSpan={6}
          scrollable
          iconBg="rgba(6,182,212,0.12)"
          iconColor="#06b6d4"
        >
          <div className="space-y-1 text-xs">
            {recentEvents.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Activity size={28} className="mx-auto mb-2 opacity-35" />
                <p className="text-xs">No activity logged yet.</p>
              </div>
            ) : (
              recentEvents.map((e, idx) => (
                <div key={e.id} className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: e.category === 'tasks' ? '#06b6d4' : e.category === 'focus' ? '#a855f7' : '#ec4899' }}
                    />
                    {idx < recentEvents.length - 1 && (
                      <div className="w-px h-full bg-white/5 mt-1" style={{ minHeight: 16 }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-white block font-semibold truncate">{e.metadata.title || e.type}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-500">{format(parseISO(e.timestamp), 'h:mm a')}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
                        style={{
                          background: e.category === 'tasks' ? 'rgba(6,182,212,0.1)' : e.category === 'focus' ? 'rgba(168,85,247,0.1)' : 'rgba(236,72,153,0.1)',
                          color: e.category === 'tasks' ? '#06b6d4' : e.category === 'focus' ? '#a855f7' : '#ec4899',
                        }}
                      >
                        {e.category}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DashboardWidget>

        {/* ============================================================
            SECTION 7 — SAVINGS
            ============================================================ */}
        <h2 className="dashboard-section-title">Savings</h2>

        <DashboardWidget
          icon={PiggyBank}
          title="Savings Progress"
          badge={savingsSummary ? `${savingsSummary.count} goal${savingsSummary.count !== 1 ? 's' : ''}` : '0'}
          colSpan={12}
          iconBg="rgba(16,185,129,0.12)"
          iconColor="#10b981"
          headerAction={
            <button
              onClick={() => setPage('finance')}
              className="px-3 py-1.5 bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
            >
              Manage
            </button>
          }
        >
          {!savingsSummary ? (
            <div className="text-center py-6 text-gray-500">
              <PiggyBank size={28} className="mx-auto mb-2 opacity-35" />
              <p className="text-xs">No savings goals created yet.</p>
              <button
                onClick={() => setPage('finance')}
                className="text-[10px] text-green-400 hover:text-green-300 font-bold mt-2"
              >
                + Create a Savings Goal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {/* Current Goal */}
              <div className="sm:col-span-2 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ background: savingsSummary.goal.color || '#10b981' }} />
                  <span className="text-sm font-bold text-white truncate">{savingsSummary.goal.title}</span>
                </div>
                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${savingsSummary.goal.color || '#10b981'}, #06b6d4)`,
                      width: `${savingsSummary.pct}%`,
                      transition: 'width 0.8s ease',
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">{formatCurrency(savingsSummary.goal.current_amount)} saved</span>
                  <span className="text-white font-bold">{savingsSummary.pct}%</span>
                </div>
              </div>

              {/* Remaining Amount */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center flex flex-col justify-center">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Remaining</div>
                <div className="text-lg font-black text-amber-400" style={{ fontFamily: 'Space Grotesk' }}>
                  {formatCurrency(savingsSummary.remaining)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">of {formatCurrency(savingsSummary.goal.target_amount)}</div>
              </div>

              {/* Expected Completion / Deadline */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center flex flex-col justify-center">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                  {savingsSummary.goal.deadline ? 'Deadline' : 'Total Saved'}
                </div>
                <div className="text-lg font-black text-green-400" style={{ fontFamily: 'Space Grotesk' }}>
                  {savingsSummary.goal.deadline
                    ? format(parseISO(savingsSummary.goal.deadline), 'MMM d')
                    : formatCurrency(savingsSummary.totalSaved)
                  }
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {savingsSummary.goal.deadline
                    ? format(parseISO(savingsSummary.goal.deadline), 'yyyy')
                    : `across ${savingsSummary.count} goals`
                  }
                </div>
              </div>
            </div>
          )}
        </DashboardWidget>

      </DashboardGrid>

      {/* ============================================================
          MODALS & FORM POPUPS
          ============================================================ */}
      {showQuickAddExpense && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-5 w-full max-w-sm space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-white">Quick Add Expense</h4>
              <button onClick={() => setShowQuickAddExpense(false)} className="text-slate-500"><X size={16} /></button>
            </div>
            <div className="space-y-3 text-xs">
              <input type="text" placeholder="Expense name" value={quickExpenseName} onChange={(e) => setQuickExpenseName(e.target.value)} className="input-glass w-full px-3 py-2" />
              <input type="number" placeholder="Amount" value={quickExpenseAmount} onChange={(e) => setQuickExpenseAmount(e.target.value)} className="input-glass w-full px-3 py-2" />
            </div>
            <button onClick={handleQuickAddExpense} className="btn-neon w-full py-2 text-xs font-bold">Add Expense</button>
          </div>
        </div>
      )}

      {showQuickAddTask && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-5 w-full max-w-sm space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-white">Quick Add Task</h4>
              <button onClick={() => setShowQuickAddTask(false)} className="text-slate-500"><X size={16} /></button>
            </div>
            <div className="space-y-3 text-xs">
              <input type="text" placeholder="Task title" value={quickTaskTitle} onChange={(e) => setQuickTaskTitle(e.target.value)} className="input-glass w-full px-3 py-2" />
            </div>
            <button onClick={handleQuickAddTask} className="btn-neon w-full py-2 text-xs font-bold">Create Task</button>
          </div>
        </div>
      )}

      {/* Task Details Modal sharing */}
      {selectedTaskDetails && (
        <TaskDetailsModal
          task={selectedTaskDetails.task}
          completed={selectedTaskDetails.completed}
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
              selectedTaskDetails.completed,
              selectedTaskDetails.date
            );
            setSelectedTaskDetails((prev) =>
              prev ? { ...prev, completed: !prev.completed } : null
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

    </div>
  );
}
