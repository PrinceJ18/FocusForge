import React, { useMemo, useState } from 'react';
import {
  Wallet, Brain, AlertTriangle, Sparkles, Timer, TrendingUp, Target,
  CheckSquare, Zap, ArrowUpRight, ArrowDownRight, Clock, Star,
  Award, Play, Pause, RotateCcw, Plus, Calendar, Bell, ChevronUp, ChevronDown, Eye, EyeOff, Pin, X
} from 'lucide-react';
import { useStore, type Page } from '../store/useStore';
import { format, parseISO, isToday, differenceInDays } from 'date-fns';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { formatCurrency } from '../lib/formatCurrency';
import { getLevelInfo } from '../lib/levels';
import { calculateDashboardStatistics, calculateMonthlyReportData } from '../lib/statistics';
import { useDailyGoalsStore } from '../store/useDailyGoalsStore';
import { payRecurringExpense } from '../lib/recurringUtils';
import { supabase } from '../lib/supabase';

const WIDGET_LABELS: Record<string, string> = {
  hero: 'Welcome Banner',
  goals: "Today's Goals Status",
  timer: 'Quick Focus Timer',
  snapshot: "Today's Snapshot",
  upcoming: 'Upcoming Schedule & Deadlines',
  insights: 'Smart AI Insights',
  actions: 'Quick Action Shortcuts',
  recent: 'Recent Event Timeline',
  achievements: 'Achievements & Journey Preview',
  weekly: 'Weekly Progress Overview',
  monthly: 'Monthly Performance metrics',
  score: 'Productivity Score breakdown',
  recommendations: 'Recommended Actions',
};

export default function Dashboard() {
  const {
    expenses, tasks, focusSessions, savingsGoals, profile, user, setPage,
    timerSeconds, timerRunning, timerMode, setTimerSeconds, setTimerRunning, setTimerMode,
    preferences, updatePreferencesLocal, events, recurringExpenses, addExpenseLocal, addTaskLocal
  } = useStore();

  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [showQuickAddExpense, setShowQuickAddExpense] = useState(false);
  const [showQuickAddTask, setShowQuickAddTask] = useState(false);

  // Quick inputs
  const [quickExpenseName, setQuickExpenseName] = useState('');
  const [quickExpenseAmount, setQuickExpenseAmount] = useState('');
  const [quickTaskTitle, setQuickTaskTitle] = useState('');

  // ----------------------------------------------------
  // STATISTICS & METRICS
  // ----------------------------------------------------
  const stats = useMemo(() => {
    return calculateDashboardStatistics({ expenses, tasks, focusSessions, savingsGoals, profile });
  }, [expenses, tasks, focusSessions, savingsGoals, profile]);

  const dailyGoals = useDailyGoalsStore();

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
    const spentFocus = stats.todayMinutes || 0;
    return Math.max(0, targetFocus - spentFocus);
  }, [preferences, stats.todayMinutes]);

  // Insights algorithm
  const smartInsights = useMemo(() => {
    const list: Array<{ title: string; desc: string; color: string; icon: any }> = [];
    
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
    if (stats.totalSpent > profile.monthly_budget * 0.8) {
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
    if (stats.todayMinutes > 0) {
      list.push({
        title: 'Focus consistency',
        desc: `You logged ${stats.todayMinutes} focus minutes today. Excellent work!`,
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
  }, [profile.xp, levelInfo, stats, profile.monthly_budget]);

  // Recommendations Engine
  const recommendations = useMemo(() => {
    const list: string[] = [];
    const pending = tasks.filter(t => !t.completed).length;

    if (pending > 0) {
      list.push(`Finish ${Math.min(2, pending)} pending tasks to clear your workspace.`);
    }
    if (stats.todayMinutes < (preferences.default_daily_focus_goal || 120)) {
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
  }, [tasks, stats.todayMinutes, expenses, profile.xp, preferences]);

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

  // Upcoming deadlines/schedules
  const upcomingDeadlines = useMemo(() => {
    return tasks
      .filter(t => !t.completed && t.deadline)
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
      .slice(0, 3);
  }, [tasks]);

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

  // ----------------------------------------------------
  // LAYOUT CUSTOMIZATION LOGIC
  // ----------------------------------------------------
  const widgetOrder = useMemo(() => {
    const list = (preferences.dashboard_widgets || 'hero,goals,timer,snapshot,upcoming,insights,actions,recent,achievements,weekly,monthly,score,recommendations')
      .split(',')
      .filter(Boolean);
    
    // Filter out hidden widgets
    const hidden = (preferences.dashboard_hidden_widgets || '').split(',').filter(Boolean);
    const visible = list.filter(w => !hidden.includes(w));

    // Handle pinned widgets
    const pinned = (preferences.dashboard_pinned_widgets || '').split(',').filter(Boolean);
    const unpinned = visible.filter(w => !pinned.includes(w));

    return [...pinned, ...unpinned];
  }, [preferences.dashboard_widgets, preferences.dashboard_hidden_widgets, preferences.dashboard_pinned_widgets]);

  const handleToggleWidget = (id: string) => {
    const hidden = (preferences.dashboard_hidden_widgets || '').split(',').filter(Boolean);
    let nextHidden: string[];
    if (hidden.includes(id)) {
      nextHidden = hidden.filter(w => w !== id);
    } else {
      nextHidden = [...hidden, id];
    }
    updatePreferencesLocal({ dashboard_hidden_widgets: nextHidden.join(',') });
  };

  const handleTogglePin = (id: string) => {
    const pinned = (preferences.dashboard_pinned_widgets || '').split(',').filter(Boolean);
    let nextPinned: string[];
    if (pinned.includes(id)) {
      nextPinned = pinned.filter(w => w !== id);
    } else {
      nextPinned = [...pinned, id];
    }
    updatePreferencesLocal({ dashboard_pinned_widgets: nextPinned.join(',') });
  };

  const handleMoveWidget = (id: string, direction: 'up' | 'down') => {
    const list = (preferences.dashboard_widgets || 'hero,goals,timer,snapshot,upcoming,insights,actions,recent,achievements,weekly,monthly,score,recommendations')
      .split(',')
      .filter(Boolean);
    const idx = list.indexOf(id);
    if (idx === -1) return;

    if (direction === 'up' && idx > 0) {
      const temp = list[idx - 1];
      list[idx - 1] = list[idx];
      list[idx] = temp;
    } else if (direction === 'down' && idx < list.length - 1) {
      const temp = list[idx + 1];
      list[idx + 1] = list[idx];
      list[idx] = temp;
    }

    updatePreferencesLocal({ dashboard_widgets: list.join(',') });
  };

  // ----------------------------------------------------
  // QUICK ACTIONS CALLS
  // ----------------------------------------------------
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
      const newT = {
        id: crypto.randomUUID(),
        user_id: user?.id || 'local',
        title: quickTaskTitle,
        priority: 'medium' as const,
        deadline: null,
        completed: false,
        subject: 'Other',
        created_at: new Date().toISOString(),
        completed_at: null,
      };
      addTaskLocal(newT);
      if (user) {
        await supabase.from('tasks').insert({
          id: newT.id,
          user_id: user.id,
          title: newT.title,
          priority: newT.priority,
          completed: newT.completed,
          subject: newT.subject,
        });
      }
      setQuickTaskTitle('');
      setShowQuickAddTask(false);
    }
  };

  return (
    <div className={`page-enter space-y-6 pb-12 ${preferences.dashboard_compact ? 'dashboard-compact' : ''}`}>
      
      {/* CUSTOMIZE TRIGGERS */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Productivity Command Center</span>
        <div className="flex gap-2">
          <button
            onClick={() => updatePreferencesLocal({ dashboard_compact: !preferences.dashboard_compact })}
            className="px-3 py-1.5 bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-semibold"
          >
            {preferences.dashboard_compact ? 'Expanded View' : 'Compact View'}
          </button>
          <button
            onClick={() => setCustomizeOpen(!customizeOpen)}
            className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 rounded-lg text-xs font-semibold"
          >
            {customizeOpen ? 'Close Settings' : 'Customize Widgets'}
          </button>
        </div>
      </div>

      {/* CUSTOMIZE CONFIG PANEL */}
      {customizeOpen && (
        <div className="glass-card p-4 border border-purple-500/20 bg-purple-500/2">
          <h3 className="text-xs font-bold text-white mb-2 uppercase tracking-wide">Configure Dashboard Layout</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {Object.keys(WIDGET_LABELS).map(id => {
              const isHidden = (preferences.dashboard_hidden_widgets || '').split(',').includes(id);
              const isPinned = (preferences.dashboard_pinned_widgets || '').split(',').includes(id);
              return (
                <div key={id} className="p-2.5 bg-slate-950/40 rounded-xl border border-white/5 flex items-center justify-between text-xs gap-3">
                  <span className="text-slate-300 font-medium truncate">{WIDGET_LABELS[id]}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleTogglePin(id)}
                      className={`p-1 rounded ${isPinned ? 'text-purple-400 bg-purple-500/10' : 'text-slate-600 hover:text-slate-400'}`}
                      title={isPinned ? 'Unpin' : 'Pin to top'}
                    >
                      <Pin size={11} />
                    </button>
                    <button
                      onClick={() => handleToggleWidget(id)}
                      className={`p-1 rounded ${isHidden ? 'text-red-400 bg-red-500/10' : 'text-green-400 bg-green-500/10'}`}
                      title={isHidden ? 'Show' : 'Hide'}
                    >
                      {isHidden ? <EyeOff size={11} /> : <Eye size={11} />}
                    </button>
                    <button onClick={() => handleMoveWidget(id, 'up')} className="p-0.5 text-slate-500 hover:text-white">
                      <ChevronUp size={11} />
                    </button>
                    <button onClick={() => handleMoveWidget(id, 'down')} className="p-0.5 text-slate-500 hover:text-white">
                      <ChevronDown size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RENDER DYNAMIC WIDGET GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {widgetOrder.map(widgetId => {
          switch (widgetId) {
            
            // SECTION 1: Welcome Hero
            case 'hero':
              return (
                <div
                  key="hero"
                  className="glass-card p-5 relative overflow-hidden flex flex-col justify-between col-span-1 md:col-span-2 lg:col-span-3 min-h-[160px]"
                  style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(236,72,153,0.08))' }}
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-purple-400 uppercase tracking-widest font-black">Hero Command</span>
                      <span className="text-xs text-slate-400">☀️ Clear • 28°C</span>
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
                      <div className="bg-purple-500 h-full" style={{ width: `${((profile.xp % 100) / 100) * 100}%` }} />
                    </div>
                    <div>Streak: <span className="text-amber-500 font-bold">🔥 {profile.streak} Days</span></div>
                  </div>
                </div>
              );

            // SECTION 2: Today's Goals
            case 'goals':
              const focusPct = Math.min(100, ((stats.todayMinutes || 0) / (preferences.default_daily_focus_goal || 120)) * 100);
              return (
                <div key="goals" className="glass-card p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Focus Goal</h3>
                    <span className="text-xs font-black text-purple-400">{focusPct.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full" style={{ width: `${focusPct}%` }} />
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Est Time Left: {estimatedTimeLeft}m</span>
                    <span>Goal: {preferences.default_daily_focus_goal || 120}m</span>
                  </div>
                </div>
              );

            // SECTION 3: Quick Focus Timer
            case 'timer':
              return (
                <div key="timer" className="glass-card p-5 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Focus Sprint</h3>
                    <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-black uppercase">
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
              );

            // SECTION 4: Today's Snapshot
            case 'snapshot':
              return (
                <div key="snapshot" className="glass-card p-5 col-span-1 md:col-span-2 lg:col-span-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Today's Snapshot</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-3 bg-white/2 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-500 block">Focus Minutes</span>
                      <span className="text-lg font-black text-purple-400">{stats.todayMinutes || 0}</span>
                    </div>
                    <div className="p-3 bg-white/2 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-500 block">Tasks Completed</span>
                      <span className="text-lg font-black text-pink-400">
                        {tasks.filter(t => t.completed && t.completed_at?.startsWith(format(new Date(), 'yyyy-MM-dd'))).length}
                      </span>
                    </div>
                    <div className="p-3 bg-white/2 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-500 block">Expenses Logged</span>
                      <span className="text-lg font-black text-cyan-400">
                        {expenses.filter(e => e.expense_date === format(new Date(), 'yyyy-MM-dd')).length}
                      </span>
                    </div>
                    <div className="p-3 bg-white/2 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-500 block">Budget Left</span>
                      <span className="text-lg font-black text-green-400">{formatCurrency(stats.available || 0)}</span>
                    </div>
                  </div>
                </div>
              );

            // SECTION 5: Upcoming Deadlines & Bills
            case 'upcoming':
              return (
                <div key="upcoming" className="glass-card p-5 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upcoming Schedule</h3>
                  <div className="space-y-2 text-xs">
                    {upcomingDeadlines.length === 0 && upcomingBills.length === 0 ? (
                      <p className="text-slate-500 text-center py-2">Nothing scheduled for next 7 days.</p>
                    ) : (
                      <>
                        {upcomingDeadlines.map(t => (
                          <div key={t.id} className="flex justify-between items-center p-2 bg-slate-950/40 border border-white/5 rounded-lg">
                            <span className="text-slate-300 truncate max-w-[120px]">{t.title}</span>
                            <span className="text-[9px] text-pink-400 font-bold uppercase">Task Due</span>
                          </div>
                        ))}
                        {upcomingBills.map(b => (
                          <div
                            key={b.id}
                            className="flex justify-between items-center p-2 bg-slate-950/40 border border-white/5 rounded-lg cursor-pointer hover:border-purple-500/20"
                            onClick={() => payRecurringExpense(b.id)}
                          >
                            <span className="text-slate-300 truncate max-w-[120px]">{b.name}</span>
                            <span className="text-[9px] text-cyan-400 font-bold uppercase">-{formatCurrency(b.amount)}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              );

            // SECTION 6: Smart AI Insights
            case 'insights':
              return (
                <div key="insights" className="glass-card p-5 space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Smart Insights</h3>
                  <div className="space-y-2 text-xs">
                    {smartInsights.map((insight, idx) => {
                      const Icon = insight.icon;
                      return (
                        <div key={idx} className="p-3 bg-white/2 rounded-xl border border-white/5 flex items-start gap-2.5">
                          <Icon size={14} style={{ color: insight.color }} className="mt-0.5" />
                          <div>
                            <h4 className="font-bold text-white">{insight.title}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">{insight.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );

            // SECTION 7: Quick Actions
            case 'actions':
              return (
                <div key="actions" className="glass-card p-5">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h3>
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

                  {/* QUICK EXPENSE MODAL */}
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

                  {/* QUICK TASK MODAL */}
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
                </div>
              );

            // SECTION 8: Recent Activity
            case 'recent':
              return (
                <div key="recent" className="glass-card p-5 space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Activity</h3>
                  <div className="space-y-2 text-xs">
                    {recentEvents.length === 0 ? (
                      <p className="text-slate-500 text-center py-2">No activity logged.</p>
                    ) : (
                      recentEvents.map(e => (
                        <div key={e.id} className="flex justify-between items-center border-b border-white/5 pb-1">
                          <div>
                            <span className="text-white block font-semibold">{e.metadata.title || e.type}</span>
                            <span className="text-[10px] text-slate-500">{format(parseISO(e.timestamp), 'h:mm a')}</span>
                          </div>
                          <span className="text-[10px] text-purple-400 uppercase font-black">{e.category}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );

            // SECTION 9: Achievements Preview
            case 'achievements':
              return (
                <div key="achievements" className="glass-card p-5 flex flex-col justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Journey Progress</h3>
                  <div className="p-3 bg-white/2 rounded-xl border border-white/5 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Badges</span>
                      <span className="font-bold text-white">{achievementsPreview.totalBadges}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Latest Unlock</span>
                      <span className="font-bold text-purple-400 truncate max-w-[120px]">{achievementsPreview.latestAch}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setPage('achievements')}
                    className="mt-3 py-1.5 bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-300 font-bold rounded-lg text-xs w-full text-center"
                  >
                    Open Journey Map
                  </button>
                </div>
              );

            // SECTION 10: Weekly Progress
            case 'weekly':
              const weekSpent = expenses.filter(e => differenceInDays(new Date(), parseISO(e.expense_date)) <= 7).reduce((sum, e) => sum + e.amount, 0);
              return (
                <div key="weekly" className="glass-card p-5 space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Weekly Mini Preview</h3>
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Weekly Budget Used</span>
                        <span className="font-bold">{formatCurrency(weekSpent)}</span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-purple-500 h-full" style={{ width: `${Math.min(100, (weekSpent / 1500) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              );

            // SECTION 11: Monthly Progress
            case 'monthly':
              const monthSpent = expenses.filter(e => differenceInDays(new Date(), parseISO(e.expense_date)) <= 30).reduce((sum, e) => sum + e.amount, 0);
              return (
                <div key="monthly" className="glass-card p-5 space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly Mini Preview</h3>
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Monthly Expenses</span>
                        <span className="font-bold">{formatCurrency(monthSpent)}</span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-purple-500 h-full" style={{ width: `${Math.min(100, (monthSpent / profile.monthly_budget) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              );

            // SECTION 12: Productivity Score
            case 'score':
              return (
                <div key="score" className="glass-card p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Productivity Score</h3>
                      <span className="text-lg font-black text-purple-400">{productivityScoreExplanation.score}%</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">{productivityScoreExplanation.desc}</p>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-2 italic">
                    {productivityScoreExplanation.action}
                  </p>
                </div>
              );

            // SECTION 13: Recommendations
            case 'recommendations':
              return (
                <div key="recommendations" className="glass-card p-5 space-y-3 col-span-1 md:col-span-2 lg:col-span-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recommended Actions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {recommendations.map((rec, idx) => (
                      <div key={idx} className="p-3 bg-white/2 rounded-xl border border-white/5 flex items-start gap-2">
                        <span className="text-purple-400">⚡</span>
                        <p className="text-slate-300">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );

            default:
              return null;
          }
        })}

      </div>

    </div>
  );
}
