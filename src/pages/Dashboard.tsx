import React, { useMemo } from 'react';
import {
  Wallet, Brain,
  AlertTriangle,
  Sparkles, Timer, TrendingUp, Target, CheckSquare, Zap, ArrowUpRight, ArrowDownRight, Clock, Star
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { format, startOfMonth, isThisMonth, parseISO, isToday } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '../lib/formatCurrency';
import { getLevelInfo } from '../lib/levels';
import {
  getTodayFocusMinutes,
  getTodayFocusSessions,
  getCompletedTasksCount,
  getAllTimeFocusMinutes,
  getEarnedBadgeIds,
  ALL_BADGES,
} from '../lib/statsUtils';

const CATEGORY_COLORS: Record<string, string> = {
  food: '#f59e0b',
  transport: '#06b6d4',
  shopping: '#ec4899',
  entertainment: '#a855f7',
  health: '#10b981',
  education: '#3b82f6',
  utilities: '#6b7280',
  other: '#8b5cf6',
};

export default function Dashboard() {
  const { expenses, tasks, focusSessions, savingsGoals, profile, user, setPage } = useStore();
  // ===== PRODUCTIVITY CALCULATIONS =====

  const completedTasks = getCompletedTasksCount(tasks);
  const totalTasks = tasks?.length || 0;

  const totalFocusMinutes = getAllTimeFocusMinutes(focusSessions);

  const focusMinutes = totalFocusMinutes;

  // Badge count — single source of truth shared with Rewards page
  const earnedBadges = useMemo(
    () => getEarnedBadgeIds({ profile, focusSessions, tasks, savingsGoals }),
    [profile, focusSessions, tasks, savingsGoals]
  );

  const streak = profile?.streak || 0;


  const displayName =
    profile.display_name ||
    user?.email?.split('@')[0] ||
    'User';

  const stats = useMemo(() => {
    const monthExpenses = expenses.filter((e) => isThisMonth(parseISO(e.expense_date)));
    const totalSpent = monthExpenses.reduce((s, e) => s + e.amount, 0);
    const available = profile.monthly_budget - totalSpent;
    const budgetPct = Math.min((totalSpent / profile.monthly_budget) * 100, 100);

    const todayMinutes = getTodayFocusMinutes(focusSessions);
    const todaySessionCount = getTodayFocusSessions(focusSessions);

    const pendingTasks = tasks.filter((t) => !t.completed).length;
    const completedToday = tasks.filter(
      (t) => t.completed && t.completed_at && isToday(parseISO(t.completed_at))
    ).length;

    // Category breakdown for donut
    const catMap: Record<string, number> = {};
    monthExpenses.forEach((e) => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });
    const categoryData = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return { totalSpent, available, budgetPct, todayMinutes, todaySessionCount, pendingTasks, completedToday, categoryData, monthExpenses };
  }, [expenses, tasks, focusSessions, profile]);

  // ===== PRODUCTIVITY SCORE =====

  const productivityScore = Math.min(
    100,
    Math.round(
      (completedTasks * 12) +
      (focusMinutes * 0.35) +
      (streak * 5) +
      (stats.totalSpent < profile.monthly_budget ? 15 : 0)
    )
  );

  // ===== PRODUCTIVITY LABEL =====

  let productivityLabel = 'Needs Improvement';

  if (productivityScore >= 75) {
    productivityLabel = 'Excellent';
  } else if (productivityScore >= 50) {
    productivityLabel = 'Good Progress';
  } else if (productivityScore >= 30) {
    productivityLabel = 'Average';
  }

  const productivityStatus =
    productivityScore >= 80
      ? 'Excellent'
      : productivityScore >= 60
        ? 'Good'
        : productivityScore >= 40
          ? 'Average'
          : productivityLabel;

  const budgetPercentage = Math.round(
    (stats.totalSpent / profile.monthly_budget) * 100
  );

  // ===== BUDGET CALCULATIONS =====

  const totalSpent = stats.totalSpent;

  const monthlyBudget = profile.monthly_budget || 5000;

  const remainingBudget = monthlyBudget - totalSpent;

  const budgetUsedPercent = Math.min(
    100,
    Math.floor((totalSpent / monthlyBudget) * 100)
  );

  // ===== BUDGET STATUS =====

  let budgetStatus = 'Healthy';

  if (budgetUsedPercent >= 90) {
    budgetStatus = 'Critical';
  } else if (budgetUsedPercent >= 70) {
    budgetStatus = 'Warning';
  }

  const budgetHealth =
    budgetUsedPercent < 50
      ? 'Healthy'
      : budgetUsedPercent < 80
        ? 'Moderate'
        : budgetStatus;

  const budgetColor =
    budgetUsedPercent < 50
      ? '#10b981'
      : budgetUsedPercent < 80
        ? '#f59e0b'
        : '#ef4444';


  const insights = [
    {
      title:
        stats.totalSpent > profile.monthly_budget * 0.8
          ? 'Budget Alert'
          : 'Budget Healthy',

      description:
        stats.totalSpent > profile.monthly_budget * 0.8
          ? 'You are close to exceeding your monthly budget.'
          : 'Your spending is under control this month.',

      icon:
        stats.totalSpent > profile.monthly_budget * 0.8
          ? AlertTriangle
          : TrendingUp,

      color:
        stats.totalSpent > profile.monthly_budget * 0.8
          ? '#f59e0b'
          : '#10b981',
    },

    {
      title: 'Focus Progress',

      description:
        stats.todayMinutes > 120
          ? 'Amazing focus consistency today!'
          : 'Try completing more focus sessions.',

      icon: Target,

      color: '#a855f7',
    },

    {
      title: 'Task Productivity',

      description:
        stats.pendingTasks === 0
          ? 'All tasks completed successfully.'
          : `${stats.pendingTasks} tasks still pending.`,

      icon: Brain,

      color: '#06b6d4',
    },

    {
      title: 'Motivation',

      description:
        profile.streak > 3
          ? `You're on a ${profile.streak} day streak 🔥`
          : 'Complete sessions daily to build streaks.',

      icon: Sparkles,

      color: '#ec4899',
    },
  ];

  const recentExpenses = expenses.slice(0, 5);

  const pendingTasksList = tasks
    .filter((t) => !t.completed)
    .slice(0, 5);

  const levelInfo = getLevelInfo(profile.xp);
  const xpLevel = levelInfo.level;


  return (
    <div className="page-enter space-y-6 px-2 lg:px-0">


      {/* Welcome banner */}
      <div
        className="glass-card p-4 sm:p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(236,72,153,0.08))' }}
      >
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #a855f7, transparent)', transform: 'translate(30%, -30%)' }}
        />
        <div className="relative z-10">
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
            {format(new Date(), 'EEEE, MMMM d')}
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk', color: 'var(--text-primary)' }}>
            {user ? `Welcome back, ${profile.display_name || user.email?.split('@')[0]}!` : 'Welcome to FocusForge'}
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {stats.todayMinutes > 0
              ? `You've focused for ${stats.todayMinutes} minutes today. Keep it up!`
              : 'Start a focus session to boost your productivity today.'}
          </p>
          {!user && (
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Sign in to sync your data across all devices.
            </p>
          )}
        </div>
      </div>


      {/* Quick stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* XP Card */}
        <div
          className="glass-card p-5 relative overflow-hidden transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(236,72,153,0.08))',
          }}
        >
          <div
            className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20"
            style={{
              background: 'radial-gradient(circle, #a855f7, transparent)',
              transform: 'translate(30%, -30%)',
            }}
          />

          <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
            Total XP
          </p>

          <h2
            className="text-3xl font-black"
            style={{
              color: 'white',
              fontFamily: 'Space Grotesk',
            }}
          >
            {profile.xp}
          </h2>

          <p className="text-xs mt-2" style={{ color: '#a855f7' }}>
            Level Progress 🚀
          </p>
        </div>

        {/* Focus Time */}
        <div
          className="glass-card p-5 transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: 'rgba(16,185,129,0.08)',
          }}
        >
          <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
            Focus Time
          </p>

          <h2
            className="text-3xl font-black"
            style={{
              color: '#10b981',
              fontFamily: 'Space Grotesk',
            }}
          >
            {stats.todayMinutes}m
          </h2>

          <p className="text-xs mt-2" style={{ color: '#10b981' }}>
            Deep Work 🔥
          </p>
        </div>

        {/* Expenses */}
        <div
          className="glass-card p-5 transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: 'rgba(245,158,11,0.08)',
          }}
        >
          <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
            Expenses
          </p>

          <h2
            className="text-3xl font-black"
            style={{
              color: '#f59e0b',
              fontFamily: 'Space Grotesk',
            }}
          >
            ₹{stats.totalSpent}
          </h2>

          <p className="text-xs mt-2" style={{ color: '#f59e0b' }}>
            Smart Spending 💰
          </p>
        </div>

        {/* Streak */}
        <div
          className="glass-card p-5 transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: 'rgba(59,130,246,0.08)',
          }}
        >
          <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
            Streak
          </p>

          <h2
            className="text-3xl font-black"
            style={{
              color: '#3b82f6',
              fontFamily: 'Space Grotesk',
            }}
          >
            {profile.streak}d
          </h2>

          <p className="text-xs mt-2" style={{ color: '#3b82f6' }}>
            Keep Going ⚡
          </p>
        </div>
      </div>

      {/* Main 2-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Finance summary */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Monthly Spending</h3>
            <button
              onClick={() => setPage('finance')}
              className="text-xs flex items-center gap-1"
              style={{ color: 'var(--purple-primary)' }}
            >
              View all <ArrowUpRight size={12} />
            </button>
          </div>

          {stats.categoryData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div style={{ width: 120, height: 120 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {stats.categoryData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={CATEGORY_COLORS[entry.name] || '#8b5cf6'}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(10,10,20,0.95)',
                        border: '1px solid rgba(168,85,247,0.3)',
                        borderRadius: 10,
                        fontSize: 12,
                        color: 'white',
                      }}
                      formatter={(val: number) => [`${formatCurrency(val)}`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {stats.categoryData.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: CATEGORY_COLORS[cat.name] || '#8b5cf6' }}
                      />
                      <span className="text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>
                        {cat.name}
                      </span>
                    </div>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(cat.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              <Wallet size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No expenses this month</p>
              <button
                onClick={() => setPage('finance')}
                className="mt-3 text-xs btn-neon px-3 py-1.5"
                style={{ borderRadius: 8 }}
              >
                Add Expense
              </button>
            </div>
          )}

          {/* Recent expenses */}
          {recentExpenses.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Recent</p>
              {recentExpenses.slice(0, 3).map((exp) => (
                <div key={exp.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                      style={{
                        background: `${CATEGORY_COLORS[exp.category] || '#8b5cf6'}20`,
                        color: CATEGORY_COLORS[exp.category] || '#8b5cf6',
                      }}
                    >
                      {getCategoryEmoji(exp.category)}
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{exp.title}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{exp.expense_date}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>-{formatCurrency(exp.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Productivity summary */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Focus & Tasks</h3>
            <button
              onClick={() => setPage('productivity')}
              className="text-xs flex items-center gap-1"
              style={{ color: 'var(--purple-primary)' }}
            >
              Focus now <ArrowUpRight size={12} />
            </button>
          </div>

          {/* Focus today */}
          <div
            className="p-4 rounded-14 mb-4 flex items-center gap-4"
            style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: 12 }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(168,85,247,0.2)' }}
            >
              <Timer size={24} style={{ color: '#a855f7' }} />
            </div>
            <div>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {stats.todayMinutes} <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>min</span>
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Focus time today</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {stats.todaySessionCount}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>sessions</p>
            </div>
          </div>

          {/* Tasks list */}
          <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>
            Pending Tasks ({pendingTasksList.length})
          </p>

          {pendingTasksList.length > 0 ? (
            <div className="space-y-2">
              {pendingTasksList.map((task) => (
                <div key={task.id} className="flex items-center gap-3 py-1.5">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      background:
                        task.priority === 'high'
                          ? '#ef4444'
                          : task.priority === 'medium'
                            ? '#f59e0b'
                            : '#10b981',
                    }}
                  />
                  <p className="text-sm flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                    {task.title}
                  </p>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background:
                        task.priority === 'high'
                          ? 'rgba(239,68,68,0.15)'
                          : task.priority === 'medium'
                            ? 'rgba(245,158,11,0.15)'
                            : 'rgba(16,185,129,0.15)',
                      color:
                        task.priority === 'high'
                          ? '#ef4444'
                          : task.priority === 'medium'
                            ? '#f59e0b'
                            : '#10b981',
                    }}
                  >
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
              <CheckSquare size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">All clear! No pending tasks</p>
            </div>
          )}
        </div>
      </div>


      {/* Productivity Score */}
      <div className="glass-card p-5 sm:p-6 mt-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

          <div>
            <p
              className="text-sm mb-2"
              style={{ color: 'var(--text-muted)' }}
            >
              AI Productivity Score
            </p>

            <div className="flex items-end gap-3">
              <h2
                className="text-5xl font-black gradient-text"
                style={{ lineHeight: 1 }}
              >
                {productivityScore}
              </h2>

              <span
                className="text-lg font-semibold mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                /100
              </span>
            </div>

            <p
              className="mt-2 text-sm"
              style={{
                color:
                  productivityScore >= 80
                    ? '#10b981'
                    : productivityScore >= 60
                      ? '#f59e0b'
                      : '#ef4444',
              }}
            >
              {productivityStatus}
            </p>
          </div>

          <div className="flex-1">
            <div
              className="w-full h-4 rounded-full overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.06)',
              }}
            >
              <div
                style={{
                  width: `${productivityScore}%`,
                  height: '100%',
                  borderRadius: 999,
                  transition: 'all 0.6s ease',
                  background:
                    productivityScore >= 80
                      ? 'linear-gradient(90deg,#10b981,#34d399)'
                      : productivityScore >= 60
                        ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                        : 'linear-gradient(90deg,#ef4444,#f87171)',
                }}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">

              <div
                className="rounded-2xl p-3 text-center"
                style={{
                  background: 'rgba(168,85,247,0.08)',
                }}
              >
                <p
                  className="text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Tasks
                </p>

                <h3 className="font-bold text-lg">
                  {completedTasks}
                </h3>
              </div>

              <div
                className="rounded-2xl p-3 text-center"
                style={{
                  background: 'rgba(6,182,212,0.08)',
                }}
              >
                <p
                  className="text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Focus
                </p>

                <h3 className="font-bold text-lg">
                  {focusMinutes}m
                </h3>
              </div>

              <div
                className="rounded-2xl p-3 text-center"
                style={{
                  background: 'rgba(236,72,153,0.08)',
                }}
              >
                <p
                  className="text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Streak
                </p>

                <h3 className="font-bold text-lg">
                  {profile.streak}d
                </h3>
              </div>

              <div
                className="rounded-2xl p-3 text-center"
                style={{
                  background: 'rgba(16,185,129,0.08)',
                }}
              >
                <p
                  className="text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Budget
                </p>

                <h3 className="font-bold text-lg">
                  {stats.totalSpent < profile.monthly_budget ? 'Good' : 'Risk'}
                </h3>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Budget Health */}
      <div className="glass-card p-5 sm:p-6 mt-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

          <div>
            <p
              className="text-sm mb-2"
              style={{ color: 'var(--text-muted)' }}
            >
              Budget Health
            </p>

            <div className="flex items-center gap-3">
              <h2
                className="text-3xl font-black"
                style={{ color: budgetColor }}
              >
                {budgetHealth}
              </h2>

              <div
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: `${budgetColor}20`,
                  color: budgetColor,
                }}
              >
                {budgetPercentage}%
              </div>
            </div>

            <p
              className="mt-2 text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              {budgetPercentage < 80
                ? 'Your spending is within a healthy range.'
                : 'You are close to exceeding your monthly budget.'}
            </p>
          </div>

          <div className="flex-1">
            <div
              className="w-full h-4 rounded-full overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.06)',
              }}
            >
              <div
                style={{
                  width: `${Math.min(budgetPercentage, 100)}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: budgetColor,
                  transition: 'all 0.6s ease',
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-5">

              <div
                className="rounded-2xl p-4"
                style={{
                  background: 'rgba(16,185,129,0.08)',
                }}
              >
                <p
                  className="text-xs mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Remaining Budget
                </p>

                <h3 className="text-xl font-bold">
                  {formatCurrency(
                    Math.max(
                      profile.monthly_budget - stats.totalSpent,
                      0
                    )
                  )}
                </h3>
              </div>

              <div
                className="rounded-2xl p-4"
                style={{
                  background: 'rgba(168,85,247,0.08)',
                }}
              >
                <p
                  className="text-xs mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Monthly Budget
                </p>

                <h3 className="text-xl font-bold">
                  {formatCurrency(profile.monthly_budget)}
                </h3>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Smart Insights */}
      <div className="glass-card p-5 sm:p-6 mt-6">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{
              background: 'rgba(168,85,247,0.15)',
              color: '#a855f7',
            }}
          >
            <Brain size={22} />
          </div>

          <div>
            <h2 className="text-lg font-bold">
              Smart Insights
            </h2>

            <p
              className="text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              AI-powered productivity & finance analysis
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((item, index) => {
            const Icon = item.icon;

            return (
              <div
                key={index}
                className="p-4 rounded-2xl transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${item.color}20`,
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `${item.color}20`,
                      color: item.color,
                    }}
                  >
                    <Icon size={20} />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-1">
                      {item.title}
                    </h3>

                    <p
                      className="text-sm leading-relaxed"
                      style={{
                        color: 'var(--text-muted)',
                      }}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* XP & Level progress */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
            >
              <Star size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Level {xpLevel} • {levelInfo.title}
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {profile.xp % 100} / 100 XP to next level
              </p>
            </div>
          </div>
          <button
            onClick={() => setPage('rewards')}
            className="text-xs flex items-center gap-1"
            style={{ color: 'var(--purple-primary)' }}
          >
            Rewards <ArrowUpRight size={12} />
          </button>
        </div>

        <div className="progress-bar" style={{ height: 8 }}>
          <div
            className="progress-fill xp-bar-fill"
            style={{ width: `${profile.xp % 100}%` }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-4">


          <MiniStat label="Total XP" value={profile.xp} color="#a855f7" />
          <MiniStat label="Streak" value={`${profile.streak}d`} color="#f59e0b" />
          <MiniStat label="Badges" value={earnedBadges.size} color="#10b981" />
        </div>
      </div>
    </div >
  );
}

function StatCard({
  label, value, sub, icon, color, progress, progressColor, onClick,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
  progress: number;
  progressColor: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="stat-card text-left w-full"
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}20`, color }}
        >
          {icon}
        </div>
        <ArrowUpRight size={14} style={{ color: 'var(--text-muted)' }} />
      </div>
      <div className="text-xl font-bold mb-0.5" style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>
        {value}
      </div>
      <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{sub}</div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${Math.max(0, Math.min(100, progress))}%`, background: progressColor }}
        />
      </div>
      <div className="text-xs mt-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</div>
    </button>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold" style={{ color, fontFamily: 'Space Grotesk' }}>{value}</div>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}

function getCategoryEmoji(cat: string): string {
  const map: Record<string, string> = {
    food: '🍔', transport: '🚗', shopping: '🛍', entertainment: '🎮',
    health: '💊', education: '📚', utilities: '💡', other: '📦',
  };
  return map[cat] || '📦';
}

