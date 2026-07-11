import React, { useMemo, useState } from 'react';
import {
  Wallet, Brain, AlertTriangle, Sparkles, Timer, TrendingUp, Target,
  CheckSquare, Zap, ArrowUpRight, ArrowDownRight, Clock, Star,
  Award, Play, Pause, RotateCcw, Plus, Calendar, Bell, ChevronUp, ChevronDown, Eye, EyeOff, Pin, X, List
} from 'lucide-react';
import { useStore, type Page, type Task, completeTask, uncompleteTask, deleteTask, updateTask } from '../store/useStore';
import { format, parseISO, isToday, differenceInDays } from 'date-fns';
import { formatCurrency } from '../lib/formatCurrency';
import { getLevelInfo } from '../lib/levels';
import { calculateDashboardStatistics } from '../lib/statistics';
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

  // Insights algorithm
  const smartInsights = useMemo(() => {
    const list: Array<{ title: string; desc: string; color: string; icon: any }> = [];
    const monthlySpent = getMonthlyExpensesAmount(expenses);
    const todayMinutes = getTodayFocusMinutes(focusSessions);
    
    // Level Up Insight
    const xpNeeded = levelInfo.xpToNext;
    if (xpNeeded <= 50) {
      list.push({
        title: 'Level Up Close!',
        desc: `You are only ${xpNeeded} XP away from Level ${levelInfo.level + 1}.`,
        color: '#a855f7',
        icon: Sparkles
      });
    }

    // Budget Health
    if (monthlySpent > profile.monthly_budget * 0.8) {
      list.push({
        title: 'Budget Alert',
        desc: 'You have used over 80% of your monthly budget.',
        color: '#ef4444',
        icon: AlertTriangle
      });
    } else {
      list.push({
        title: 'Budget Healthy',
        desc: 'Your spending is well within limits this month.',
        color: '#10b981',
        icon: TrendingUp
      });
    }

    // Focus Patterns
    if (todayMinutes > 0) {
      list.push({
        title: 'Focus consistency',
        desc: `You logged ${todayMinutes} focus minutes today. Excellent work!`,
        color: '#06b6d4',
        icon: Target
      });
    } else {
      list.push({
        title: 'Start Focus',
        desc: 'Set a 25-minute Pomodoro timer to jump-start your productivity.',
        color: '#6b7280',
        icon: Timer
      });
    }

    return list;
  }, [profile.xp, levelInfo, expenses, profile.monthly_budget, focusSessions]);

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
      .slice(0, 3);
  }, [recurringExpenses]);

  // Recent timeline events
  const recentEvents = useMemo(() => {
    return events.slice(0, 5);
  }, [events]);

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

  return (
    <div className="page-enter space-y-8 pb-12 text-left">
      
      {/* 0. WELCOME HERO SECTION */}
      <div
        className="glass-card p-5 relative overflow-hidden flex flex-col justify-between min-h-[160px]"
        style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(236,72,153,0.08))' }}
      >
        <div>
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-purple-400 uppercase tracking-widest font-black">Hero Command</span>
            <span className="text-xs text-slate-400">🌤️ Today • {format(todayDate, 'EEE, MMM d')}</span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-bold text-white mt-2" style={{ fontFamily: 'Space Grotesk' }}>
            {greeting}, {displayName}!
          </h2>
          <p className="text-xs text-slate-400 mt-2 max-w-xl italic">
            "Success is the sum of small efforts, repeated day-in and day-out."
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-white/5 text-xs text-slate-400">
          <div>Level: <span className="text-white font-black">{levelInfo.level}</span></div>
          <div className="w-24 bg-slate-900 h-2 rounded-full overflow-hidden">
            <div className="bg-purple-500 h-full" style={{ width: `${levelInfo.progress}%` }} />
          </div>
          <div>Streak: <span className="text-amber-500 font-bold">🔥 {profile.streak} Days</span></div>
        </div>
      </div>

      {/* ============================================================
          1. DAILY COMMAND CENTER
          ============================================================ */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white tracking-tight pl-1" style={{ fontFamily: 'Space Grotesk' }}>
          Daily Command Center
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left area: Today's Tasks */}
          <div className="glass-card p-5 lg:col-span-2 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div>
                <h4 className="font-bold text-sm text-white">Today's Tasks</h4>
                <p className="text-[10px] text-gray-400">Scheduled occurrences for today</p>
              </div>
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
            </div>

            {/* Tasks List */}
            <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1">
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
          </div>

          {/* Right area: Goals, Focus & Quick Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Goals Check list card */}
            <TodaysGoalsCard />

            {/* Quick Focus timer widget */}
            <div className="glass-card p-5 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Quick Focus Sprint</h4>
                <span className="text-[9px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-black uppercase">
                  {timerMode}
                </span>
              </div>
              <div className="text-center py-2">
                <div className="text-3xl font-black text-white" style={{ fontFamily: 'Space Grotesk' }}>
                  {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleToggleTimer}
                  className="px-3 py-1.5 bg-purple-500 text-white font-bold rounded-lg text-xs flex-1 hover:bg-purple-600 flex items-center justify-center gap-1"
                >
                  {timerRunning ? <Pause size={12} /> : <Play size={12} />}
                  {timerRunning ? 'Pause' : 'Resume'}
                </button>
                <button
                  onClick={() => handleStartTimer(25)}
                  className="px-3 py-1.5 bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-300 font-bold rounded-lg text-xs flex-1"
                >
                  Start 25m
                </button>
              </div>
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="glass-card p-5">
              <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => handleStartTimer(25)}
                  className="p-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 rounded-xl text-center font-bold"
                >
                  Start Focus
                </button>
                <button
                  onClick={() => setShowQuickAddExpense(true)}
                  className="p-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 rounded-xl text-center font-bold"
                >
                  Add Expense
                </button>
                <button
                  onClick={() => setShowQuickAddTask(true)}
                  className="p-2 bg-pink-500/10 border border-pink-500/20 text-pink-400 hover:bg-pink-500/20 rounded-xl text-center font-bold"
                >
                  Create Task
                </button>
                <button
                  onClick={() => setPage('analytics')}
                  className="p-2 bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-300 rounded-xl text-center font-bold"
                >
                  View Reports
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          2. TODAY'S SNAPSHOT
          ============================================================ */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white tracking-tight pl-1" style={{ fontFamily: 'Space Grotesk' }}>
          Today's Snapshot
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 glass-card border border-white/5 bg-white/[0.01]">
            <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">Focus Today</span>
            <span className="text-2xl font-black text-purple-400 mt-1 block" style={{ fontFamily: 'Space Grotesk' }}>
              {getTodayFocusMinutes(focusSessions)}m
            </span>
          </div>
          <div className="p-4 glass-card border border-white/5 bg-white/[0.01]">
            <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">Sessions Completed</span>
            <span className="text-2xl font-black text-pink-400 mt-1 block" style={{ fontFamily: 'Space Grotesk' }}>
              {getTodayFocusSessions(focusSessions)}
            </span>
          </div>
          <div className="p-4 glass-card border border-white/5 bg-white/[0.01]">
            <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">Tasks Completed</span>
            <span className="text-2xl font-black text-cyan-400 mt-1 block" style={{ fontFamily: 'Space Grotesk' }}>
              {todayCompletedCount}
            </span>
          </div>
          <div className="p-4 glass-card border border-white/5 bg-white/[0.01]">
            <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">Current Streak</span>
            <span className="text-2xl font-black text-green-400 mt-1 block" style={{ fontFamily: 'Space Grotesk' }}>
              🔥 {profile.streak} Days
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================
          3. FINANCIAL OVERVIEW
          ============================================================ */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white tracking-tight pl-1" style={{ fontFamily: 'Space Grotesk' }}>
          Financial Overview
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Budget stats */}
          <div className="glass-card p-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly Budget & Spending</h4>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Spent</span>
                <span className="text-white font-bold">{formatCurrency(monthlySpent)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Monthly Budget</span>
                <span className="text-white font-bold">{formatCurrency(profile.monthly_budget)}</span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-2 font-bold">
                <span className="text-gray-400">Remaining</span>
                <span className={budgetRemaining >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {formatCurrency(budgetRemaining)}
                </span>
              </div>
            </div>

            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full" 
                style={{ 
                  backgroundColor: monthlySpent > profile.monthly_budget ? '#ef4444' : '#10b981',
                  width: `${Math.min(100, (monthlySpent / Math.max(1, profile.monthly_budget)) * 100)}%` 
                }} 
              />
            </div>
            
            <button 
              onClick={() => setPage('finance')}
              className="py-1.5 w-full bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-300 font-bold rounded-lg text-xs text-center"
            >
              Open Expense Manager
            </button>
          </div>

          {/* Spending by Category progress */}
          <div className="glass-card p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Spending By Category</h4>
            
            <div className="space-y-2.5 overflow-y-auto max-h-[160px] pr-1">
              {stats.categoryData.length === 0 ? (
                <p className="text-xs text-gray-500 italic py-6 text-center">No expenses recorded this month.</p>
              ) : (
                stats.categoryData.map((cat) => {
                  const pct = Math.min(100, (cat.value / Math.max(1, stats.totalSpent)) * 100);
                  return (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-300">{cat.name}</span>
                        <span className="text-white">{formatCurrency(cat.value)} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full" 
                          style={{ backgroundColor: cat.fill, width: `${pct}%` }} 
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recurring Bills Preview */}
          <div className="glass-card p-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upcoming Bills & Subscriptions</h4>
            
            <div className="space-y-2 text-xs">
              {upcomingBills.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No active bills scheduled.</p>
              ) : (
                upcomingBills.map(b => (
                  <div
                    key={b.id}
                    className="flex justify-between items-center p-2 bg-slate-950/40 border border-white/5 rounded-lg cursor-pointer hover:border-purple-500/20 text-left"
                    onClick={() => setSelectedRecurringDetails(b)}
                  >
                    <span className="text-slate-300 truncate max-w-[120px]">{b.name}</span>
                    <span className="text-[10px] text-cyan-400 font-bold uppercase">-{formatCurrency(b.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          4. PROGRESS & INSIGHTS
          ============================================================ */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white tracking-tight pl-1" style={{ fontFamily: 'Space Grotesk' }}>
          Progress & Insights
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Smart Insights */}
          <div className="glass-card p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Smart Insights</h4>
            <div className="space-y-2 text-xs">
              {smartInsights.map((insight, idx) => {
                const Icon = insight.icon;
                return (
                  <div key={idx} className="p-3 bg-white/2 rounded-xl border border-white/5 flex items-start gap-2.5">
                    <Icon size={14} style={{ color: insight.color }} className="mt-0.5" />
                    <div>
                      <h5 className="font-bold text-white text-left">{insight.title}</h5>
                      <p className="text-[10px] text-slate-400 mt-0.5 text-left">{insight.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Productivity Score */}
          <div className="glass-card p-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Productivity Score</h4>
                <span className="text-lg font-black text-purple-400">{productivityScoreExplanation.score}%</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed text-left">{productivityScoreExplanation.desc}</p>
            </div>
            <p className="text-[11px] text-slate-300 mt-2 italic text-left">
              {productivityScoreExplanation.action}
            </p>
          </div>

          {/* Recommended Actions */}
          <div className="glass-card p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recommended Actions</h4>
            <div className="grid grid-cols-1 gap-2 text-xs">
              {recommendations.slice(0, 3).map((rec, idx) => (
                <div key={idx} className="p-3 bg-white/2 rounded-xl border border-white/5 flex items-start gap-2 text-left">
                  <span className="text-purple-400">⚡</span>
                  <p className="text-slate-300 leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          5. RECENT PROGRESS
          ============================================================ */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white tracking-tight pl-1" style={{ fontFamily: 'Space Grotesk' }}>
          Recent Progress
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Timeline Activity */}
          <div className="glass-card p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-left">Recent Activity</h4>
            <div className="space-y-2 text-xs">
              {recentEvents.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No activity logged.</p>
              ) : (
                recentEvents.map(e => (
                  <div key={e.id} className="flex justify-between items-center border-b border-white/5 pb-1">
                    <div className="text-left">
                      <span className="text-white block font-semibold">{e.metadata.title || e.type}</span>
                      <span className="text-[10px] text-slate-500">{format(parseISO(e.timestamp), 'h:mm a')}</span>
                    </div>
                    <span className="text-[10px] text-purple-400 uppercase font-black">{e.category}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Journey Map & Achievements Preview */}
          <div className="glass-card p-5 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Journey Progress</h4>
              
              <div className="p-3 bg-white/2 rounded-xl border border-white/5 space-y-2 text-xs text-left">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Badges Earned</span>
                  <span className="font-bold text-white">{achievementsPreview.totalBadges}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Latest Achievement Unlock</span>
                  <span className="font-bold text-purple-400 truncate max-w-[150px]">{achievementsPreview.latestAch}</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setPage('achievements')}
              className="mt-4 py-2 w-full bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-300 font-bold rounded-lg text-xs text-center"
            >
              Open Journey Map
            </button>
          </div>
        </div>
      </div>

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
