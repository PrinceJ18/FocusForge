import React, { useMemo, useState } from 'react';
import {
  Brain,
  DollarSign,
  Zap,
  TrendingUp,
  TrendingDown,
  Target,
  Flame,
  CheckCircle2,
  Calendar,
  Clock,
  Sparkles,
  PieChart as PieIcon,
  Activity,
  Award,
  AlertCircle,
  Plus,
  Play,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import { CustomTooltip } from '../components/analytics/CustomTooltip';
import InsightCard from '../components/analytics/InsightCard';
import FocusHeatMap from '../components/analytics/FocusHeatMap';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { formatCurrency } from '../lib/formatCurrency';
import { formatFocusTime } from '../lib/formatUtils';
import {
  calculateAnalyticsEngineData,
  AnalyticsPeriod,
  CATEGORY_COLORS,
} from '../lib/statistics/analyticsEngine';
import { generateInsights } from '../lib/insightUtils';

export default function Analytics() {
  const { expenses, focusSessions, tasks, profile, savingsGoals, events, setPage } = useStore();
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');

  // Compute rich analytics data via memoized engine
  const data = useMemo(() => {
    return calculateAnalyticsEngineData({
      expenses,
      focusSessions,
      tasks,
      profile,
      savingsGoals,
      events,
      period,
    });
  }, [expenses, focusSessions, tasks, profile, savingsGoals, events, period]);

  // Compute smart actionable insights
  const insights = useMemo(() => {
    return generateInsights({
      tasks,
      focusSessions,
      expenses,
      profile,
      events,
    });
  }, [tasks, focusSessions, expenses, profile, events]);

  // If user has zero data across all models
  if (!data.hasData) {
    return (
      <div className="page-enter py-8 space-y-6 max-w-4xl mx-auto">
        <EmptyState
          icon={Activity}
          title="No Analytics Available Yet"
          description="Complete a few focus sessions, check off tasks, or log expenses to unlock intelligent productivity insights and financial health tracking."
          action={{
            label: 'Start Focus Session',
            onClick: () => setPage('focus'),
            icon: Play,
          }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass-card p-5 text-left flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
              <Brain size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100">Deep Work Tracking</h4>
              <p className="text-xs text-slate-400 mt-1">
                Measure daily focus volume, session endurance, and peak hours.
              </p>
              <button
                onClick={() => setPage('focus')}
                className="text-xs font-semibold text-purple-400 hover:text-purple-300 mt-2 inline-flex items-center gap-1"
              >
                Launch Focus Clock →
              </button>
            </div>
          </div>

          <div className="glass-card p-5 text-left flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center shrink-0">
              <DollarSign size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100">Finance & Budget Runway</h4>
              <p className="text-xs text-slate-400 mt-1">
                Track burn rate, categorize spending, and forecast month-end balance.
              </p>
              <button
                onClick={() => setPage('finance')}
                className="text-xs font-semibold text-pink-400 hover:text-pink-300 mt-2 inline-flex items-center gap-1"
              >
                Go to Finance →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6 text-left pb-16">
      {/* ═══ 1. PERIOD CONTROLS & TOP SUMMARY ═══ */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="tab-group">
          {(
            [
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: '90d', label: '3 Months' },
              { id: 'all', label: 'All Time' },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`tab-pill ${period === p.id ? 'active' : ''}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2">
            <span className="text-slate-400">Total Spend:</span>
            <span className="font-bold text-red-400 font-mono">
              {formatCurrency(data.totalSpent)}
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2">
            <span className="text-slate-400">Total Focus:</span>
            <span className="font-bold text-purple-400 font-mono">
              {formatFocusTime(data.totalFocusMin)}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ 2. TOP KPI SCORECARDS GRID ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Wellness Score */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Wellness Index
            </span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor:
                  data.overallWellnessScore >= 75
                    ? 'rgba(16,185,129,0.15)'
                    : data.overallWellnessScore >= 50
                    ? 'rgba(168,85,247,0.15)'
                    : 'rgba(245,158,11,0.15)',
                color:
                  data.overallWellnessScore >= 75
                    ? '#10b981'
                    : data.overallWellnessScore >= 50
                    ? '#a855f7'
                    : '#f59e0b',
              }}
            >
              {data.overallWellnessLabel}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-3xl font-extrabold"
              style={{
                fontFamily: 'Space Grotesk',
                color:
                  data.overallWellnessScore >= 75
                    ? '#10b981'
                    : data.overallWellnessScore >= 50
                    ? '#a855f7'
                    : '#f59e0b',
              }}
            >
              {data.overallWellnessScore}
            </span>
            <span className="text-xs text-slate-500 font-semibold">/ 100</span>
          </div>
          <div className="w-full bg-slate-800/80 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${data.overallWellnessScore}%`,
                background: 'linear-gradient(90deg, #a855f7, #06b6d4)',
              }}
            />
          </div>
        </div>

        {/* Productivity Score */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Productivity Score
            </span>
            <span className="text-[10px] font-bold text-purple-400">
              {data.productivityScoreLabel}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-3xl font-extrabold text-purple-400"
              style={{ fontFamily: 'Space Grotesk' }}
            >
              {data.productivityScore}
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              {data.taskCompletionRate}% task rate
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>{data.completedTasksCount} tasks done</span>
            <span>{formatFocusTime(data.totalFocusMin)} focus</span>
          </div>
        </div>

        {/* Financial Discipline Score */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Financial Health
            </span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor:
                  data.budgetHealth === 'Healthy'
                    ? 'rgba(16,185,129,0.15)'
                    : data.budgetHealth === 'Warning'
                    ? 'rgba(245,158,11,0.15)'
                    : 'rgba(239,68,68,0.15)',
                color:
                  data.budgetHealth === 'Healthy'
                    ? '#10b981'
                    : data.budgetHealth === 'Warning'
                    ? '#f59e0b'
                    : '#ef4444',
              }}
            >
              {data.budgetHealth}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-3xl font-extrabold text-pink-400"
              style={{ fontFamily: 'Space Grotesk' }}
            >
              {data.financialScore}
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              {data.budgetUtilizationPct}% budget used
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>Burn: {formatCurrency(data.avgDailySpend)}/day</span>
            <span>{formatCurrency(data.availableBudget)} left</span>
          </div>
        </div>

        {/* Deep Work & Consistency */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Focus Streak & Habit
            </span>
            <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
              <Flame size={12} className="fill-amber-400" />
              {data.currentStreak}d Streak
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-3xl font-extrabold text-cyan-400"
              style={{ fontFamily: 'Space Grotesk' }}
            >
              {data.focusConsistencyRate}%
            </span>
            <span className="text-xs text-slate-500 font-semibold">Consistency</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>Avg: {formatFocusTime(data.avgSessionLength)} / session</span>
            <span>Peak: {formatFocusTime(data.longestSessionMins)}</span>
          </div>
        </div>
      </div>

      {/* ═══ 3. SMART INSIGHTS & RECOMMENDATIONS ═══ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="section-header mb-0">
            <div
              className="section-header-icon"
              style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
            >
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Intelligent Insights</h3>
              <p className="text-[11px] text-slate-400">
                Actionable trends and predictive patterns derived from your activity.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      </div>

      {/* ═══ 4. FOCUS ANALYTICS & DEEP WORK TREND ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Focus Area Chart (2 cols) */}
        <div className="lg:col-span-2 glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="section-header mb-0">
              <div
                className="section-header-icon"
                style={{ background: 'rgba(168,85,247,0.15)' }}
              >
                <Brain size={16} style={{ color: '#a855f7' }} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Focus & Deep Work Velocity</h3>
                <p className="text-[11px] text-slate-400">Daily minutes of dedicated attention.</p>
              </div>
            </div>

            {data.comparison.focusGrowthPct !== 0 && (
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                  data.comparison.focusGrowthPct > 0
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-amber-500/10 text-amber-400'
                }`}
              >
                {data.comparison.focusGrowthPct > 0 ? (
                  <TrendingUp size={12} />
                ) : (
                  <TrendingDown size={12} />
                )}
                {data.comparison.focusGrowthPct > 0 ? '+' : ''}
                {data.comparison.focusGrowthPct}% vs prior period
              </span>
            )}
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyTimeline}>
                <defs>
                  <linearGradient id="focusGradientAnalytics" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.max(0, Math.floor(data.dailyTimeline.length / 7))}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }}
                  axisLine={false}
                  tickLine={false}
                  unit="m"
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{
                    stroke: 'rgba(168,85,247,0.3)',
                    strokeWidth: 1,
                    strokeDasharray: '3 3',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="focus"
                  name="Focus (min)"
                  stroke="#a855f7"
                  fill="url(#focusGradientAnalytics)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, stroke: '#a855f7', strokeWidth: 2, fill: '#100c1e' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Highlight Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/5">
            <HighlightPill
              label="Best Day"
              value={data.bestFocusDay.dayName}
              sub={data.bestFocusDay.avgMinutes > 0 ? `Avg ${formatFocusTime(data.bestFocusDay.avgMinutes)}` : undefined}
              color="#a855f7"
            />
            <HighlightPill
              label="Prime Window"
              value={data.bestFocusHour.timeWindow.split(' ')[0]}
              sub={data.bestFocusHour.timeWindow.replace(/^[A-Za-z]+\s/, '')}
              color="#06b6d4"
            />
            <HighlightPill
              label="Avg Session"
              value={formatFocusTime(data.avgSessionLength)}
              sub="Per session block"
              color="#10b981"
            />
            <HighlightPill
              label="Longest Block"
              value={formatFocusTime(data.longestSessionMins)}
              sub="Deep work record"
              color="#f59e0b"
            />
          </div>
        </div>

        {/* Weekly Focus Distribution (1 col) */}
        <div className="glass-card p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="section-header">
              <div
                className="section-header-icon"
                style={{ background: 'rgba(6,182,212,0.15)' }}
              >
                <Calendar size={16} style={{ color: '#06b6d4' }} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Weekly Consistency</h3>
                <p className="text-[11px] text-slate-400">Focus hours over the last 4 weeks.</p>
              </div>
            </div>

            <div className="h-44 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.weeklyFocusBars} barSize={26}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }}
                    axisLine={false}
                    tickLine={false}
                    unit="h"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="hours"
                    name="Focus Hours"
                    fill="url(#focusBarGradAnalytics)"
                    radius={[6, 6, 0, 0]}
                  />
                  <defs>
                    <linearGradient id="focusBarGradAnalytics" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-3 bg-white/2 rounded-xl border border-white/5 text-xs text-slate-300">
            <span className="font-semibold text-white">Focus Target:</span> 10+ hours per week
            delivers maximum productivity compound momentum.
          </div>
        </div>
      </div>

      {/* ═══ 5. TASK VELOCITY & PRIORITY DISTRIBUTION ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Breakdown */}
        <div className="glass-card p-5 space-y-4">
          <div className="section-header mb-2">
            <div
              className="section-header-icon"
              style={{ background: 'rgba(16,185,129,0.15)' }}
            >
              <Target size={16} style={{ color: '#10b981' }} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Task Priority Execution</h3>
              <p className="text-[11px] text-slate-400">
                Completion rates categorized by task impact and urgency.
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            {/* High Priority */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-red-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  High Priority
                </span>
                <span className="font-bold text-slate-300">
                  {data.priorityDistribution.high.completed} /{' '}
                  {data.priorityDistribution.high.total} ({data.priorityDistribution.high.rate}%)
                </span>
              </div>
              <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-red-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${data.priorityDistribution.high.rate}%` }}
                />
              </div>
            </div>

            {/* Medium Priority */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Medium Priority
                </span>
                <span className="font-bold text-slate-300">
                  {data.priorityDistribution.medium.completed} /{' '}
                  {data.priorityDistribution.medium.total} ({data.priorityDistribution.medium.rate}%)
                </span>
              </div>
              <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${data.priorityDistribution.medium.rate}%` }}
                />
              </div>
            </div>

            {/* Low Priority */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-blue-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Low Priority
                </span>
                <span className="font-bold text-slate-300">
                  {data.priorityDistribution.low.completed} /{' '}
                  {data.priorityDistribution.low.total} ({data.priorityDistribution.low.rate}%)
                </span>
              </div>
              <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${data.priorityDistribution.low.rate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Predictive Forecast & Runway */}
        <div className="glass-card p-5 space-y-4">
          <div className="section-header mb-2">
            <div
              className="section-header-icon"
              style={{ background: 'rgba(236,72,153,0.15)' }}
            >
              <Zap size={16} style={{ color: '#ec4899' }} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Predictive Month-End Forecast</h3>
              <p className="text-[11px] text-slate-400">
                AI run-rate projections based on current daily pace.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-white/2 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">
                Projected Spend
              </span>
              <div className="text-lg font-bold text-white">
                {formatCurrency(data.forecast.projectedMonthEndSpend)}
              </div>
              <p className="text-[10px] text-slate-500">
                Pacing: {formatCurrency(data.forecast.dailyBurnRate)}/day
              </p>
            </div>

            <div className="p-3.5 bg-white/2 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">
                Projected Focus
              </span>
              <div className="text-lg font-bold text-purple-400">
                {data.forecast.projectedMonthEndFocusHours} hrs
              </div>
              <p className="text-[10px] text-slate-500">By end of current month</p>
            </div>
          </div>

          <div className="p-3 bg-white/2 rounded-xl border border-white/5 flex items-center justify-between text-xs">
            <span className="text-slate-300">Budget Runway Status:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded-full ${
                data.forecast.budgetHealthStatus === 'healthy'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : data.forecast.budgetHealthStatus === 'caution'
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'bg-red-500/10 text-red-400'
              }`}
            >
              {data.forecast.daysUntilBudgetExhaustion !== null
                ? `~${data.forecast.daysUntilBudgetExhaustion} days remaining`
                : 'Within Safe Limits'}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ 6. FINANCE & EXPENSE INTELLIGENCE ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Trend Area */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="section-header mb-0">
              <div
                className="section-header-icon"
                style={{ background: 'rgba(236,72,153,0.15)' }}
              >
                <DollarSign size={16} style={{ color: '#ec4899' }} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Expense Trajectory</h3>
                <p className="text-[11px] text-slate-400">Daily spending pattern over time.</p>
              </div>
            </div>

            {data.comparison.spendingChangePct !== 0 && (
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                  data.comparison.spendingChangePct < 0
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-red-500/10 text-red-400'
                }`}
              >
                {data.comparison.spendingChangePct < 0 ? '-' : '+'}
                {Math.abs(data.comparison.spendingChangePct)}% vs prior
              </span>
            )}
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyTimeline}>
                <defs>
                  <linearGradient id="spendGradAnalytics" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.max(0, Math.floor(data.dailyTimeline.length / 7))}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="spending"
                  name="Spending"
                  stroke="#ec4899"
                  fill="url(#spendGradAnalytics)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, stroke: '#ec4899', strokeWidth: 2, fill: '#100c1e' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
            <div className="p-2.5 bg-white/2 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-400 block font-semibold">Top Category</span>
              <span className="text-xs font-bold text-slate-200 truncate block mt-0.5">
                {data.topCategory.name} ({data.topCategory.percentage}%)
              </span>
            </div>
            <div className="p-2.5 bg-white/2 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-400 block font-semibold">Largest Purchase</span>
              <span className="text-xs font-bold text-red-400 truncate block mt-0.5">
                {data.largestExpense
                  ? `${data.largestExpense.title} (${formatCurrency(data.largestExpense.amount)})`
                  : 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Category Breakdown Donut */}
        <div className="glass-card p-5 space-y-4">
          <div className="section-header mb-0">
            <div
              className="section-header-icon"
              style={{ background: 'rgba(245,158,11,0.15)' }}
            >
              <PieIcon size={16} style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Category Allocation</h3>
              <p className="text-[11px] text-slate-400">Expense distribution by category.</p>
            </div>
          </div>

          {data.categoryBreakdown.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {data.categoryBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {data.categoryBreakdown.slice(0, 6).map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.fill }}
                      />
                      <span className="text-slate-300 truncate">{cat.name}</span>
                    </div>
                    <span className="font-semibold text-slate-200 font-mono">
                      {formatCurrency(cat.value)}{' '}
                      <span className="text-[10px] text-slate-500">({cat.percentage}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-500 text-xs">
              No categorized expenses logged in this period.
            </div>
          )}
        </div>
      </div>

      {/* ═══ 7. FOCUS VS SPENDING CORRELATION ═══ */}
      {data.scatterData.length > 3 && (
        <div className="glass-card p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="section-header mb-0">
              <div
                className="section-header-icon"
                style={{ background: 'rgba(168,85,247,0.15)' }}
              >
                <Activity size={16} style={{ color: '#a855f7' }} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Focus vs Spending Correlation
                </h3>
                <p className="text-[11px] text-slate-400">
                  Higher daily focus directly correlates with reduced impulse spending.
                </p>
              </div>
            </div>

            <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/25 rounded-full text-xs font-semibold text-purple-400">
              Efficiency: {data.focusDollarRatio} min focus / $1 spent
            </div>
          </div>

          <div className="h-52 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="x"
                  name="Focus (min)"
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
                  label={{
                    value: 'Focus Time (Minutes)',
                    position: 'insideBottomRight',
                    offset: -10,
                    fill: 'rgba(255,255,255,0.3)',
                    fontSize: 10,
                  }}
                />
                <YAxis
                  dataKey="y"
                  name="Spending ($)"
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
                  label={{
                    value: 'Spending',
                    angle: -90,
                    position: 'insideLeft',
                    fill: 'rgba(255,255,255,0.3)',
                    fontSize: 10,
                  }}
                />
                <ZAxis dataKey="z" range={[40, 80]} />
                <Tooltip content={<CustomTooltip />} />
                <Scatter data={data.scatterData} fill="#a855f7" fillOpacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ═══ 8. FOCUS HEAT MAP (FLAGSHIP CALENDAR FEATURE) ═══ */}
      <FocusHeatMap period={period} />
    </div>
  );
}

function HighlightPill({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div
      className="p-3 rounded-xl border text-center transition-all duration-300 hover:scale-[1.02]"
      style={{
        backgroundColor: `${color}08`,
        borderColor: `${color}20`,
      }}
    >
      <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">
        {label}
      </span>
      <span
        className="text-sm font-bold block mt-0.5 truncate"
        style={{ color, fontFamily: 'Space Grotesk' }}
      >
        {value}
      </span>
      {sub && <span className="text-[9px] text-slate-500 block truncate mt-0.5">{sub}</span>}
    </div>
  );
}
