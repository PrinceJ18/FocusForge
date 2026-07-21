import React, { useMemo, useState, useCallback } from 'react';
import {
  Wallet, Brain, AlertTriangle, Sparkles, Timer, TrendingUp, Target,
  CheckSquare, Zap, ArrowUpRight, ArrowDownRight, Clock, Star,
  Award, Play, Pause, RotateCcw, Plus, Calendar, Bell, ChevronUp, ChevronDown, Eye, EyeOff, Pin, X, List,
  PiggyBank, BarChart3, Lightbulb, Activity, Flame, Heart, Shield, SlidersHorizontal
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
import KpiCard from '../components/dashboard/KpiCard';
import DashboardCustomizeDrawer from '../components/dashboard/DashboardCustomizeDrawer';
import { WIDGET_REGISTRY } from '../components/dashboard/dashboardWidgets';
import DashboardWidgetWrapper from '../components/dashboard/DashboardWidgetWrapper';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

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
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<{ task: Task; completed: boolean; date: string } | null>(null);
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
    // Actions
    setShowCustomize, setPage, setShowQuickAddTask, setShowQuickAddExpense,
    handleStartTimer, handleToggleTask, setSelectedTaskDetails, getScoreColor
  }), [
    profile, user, stats, greeting, displayName, levelInfo, estimatedTimeLeft,
    productivityScore, prodLabel, financialScore, finLabel, smartInsights,
    focusTrendData, expenseTrendData, recommendations, productivityScoreExplanation,
    achievementsPreview, upcomingBills, recentEvents, savingsSummary, todayExpensesAmount,
    budgetRemaining, todayCompletedCount, todayTaskOccurrences, todayDate, preferences, taskSections,
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
      {showQuickAddExpense && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-sm space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-white">Quick Add Expense</h4>
              <button onClick={() => setShowQuickAddExpense(false)} className="text-text-muted hover:text-text-primary transition-colors"><X size={16} /></button>
            </div>
            <div className="space-y-3 text-xs">
              <input type="text" placeholder="Expense name" value={quickExpenseName} onChange={(e) => setQuickExpenseName(e.target.value)} className="w-full px-3 py-2 bg-background-card/50 border border-border rounded-md text-text-primary outline-none focus:border-primary" />
              <input type="number" placeholder="Amount" value={quickExpenseAmount} onChange={(e) => setQuickExpenseAmount(e.target.value)} className="w-full px-3 py-2 bg-background-card/50 border border-border rounded-md text-text-primary outline-none focus:border-primary" />
            </div>
            <Button onClick={handleQuickAddExpense} isLoading={isSubmittingExpense} className="w-full">Add Expense</Button>
          </Card>
        </div>
      )}

      {showQuickAddTask && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-sm space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-white">Quick Add Task</h4>
              <button onClick={() => setShowQuickAddTask(false)} className="text-text-muted hover:text-text-primary transition-colors"><X size={16} /></button>
            </div>
            <div className="space-y-3 text-xs">
              <input type="text" placeholder="Task title" value={quickTaskTitle} onChange={(e) => setQuickTaskTitle(e.target.value)} className="w-full px-3 py-2 bg-background-card/50 border border-border rounded-md text-text-primary outline-none focus:border-primary" />
            </div>
            <Button onClick={handleQuickAddTask} isLoading={isSubmittingTask} className="w-full">Create Task</Button>
          </Card>
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
