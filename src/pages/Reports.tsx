import React, { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { useDailyGoalsStore } from '../store/useDailyGoalsStore';
import { calculateMonthlyReportData } from '../lib/statistics';
import { formatCurrency } from '../lib/formatCurrency';
import {
  Brain, CheckSquare, Wallet, Target, Trophy, Flame, TrendingUp,
  Clock, ArrowLeft, ArrowUpRight, Award, Zap, BookOpen, Share2, Download
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { logEvent } from '../lib/events';
import { useEffect } from 'react';
import WeeklyReport from './WeeklyReport';

const CATEGORY_COLORS: Record<string, string> = {
  food: '#f59e0b', transport: '#06b6d4', shopping: '#ec4899',
  entertainment: '#a855f7', health: '#10b981', education: '#3b82f6',
  utilities: '#6b7280', other: '#8b5cf6',
};

export default function Reports() {
  const { expenses, tasks, focusSessions, savingsGoals, profile } = useStore();
  const { history: goalsHistory } = useDailyGoalsStore();

  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  useEffect(() => {
    if (selectedMonth) {
      logEvent('monthly_report_generated', 'reports', selectedMonth, {
        month: selectedMonth,
        description: `Generated Monthly Report for ${selectedMonth}`,
      });
    }
  }, [selectedMonth]);

  // Generate unique list of months with activity
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();

    focusSessions.forEach(s => {
      if (s?.session_date && typeof s.session_date === 'string') {
        monthsSet.add(s.session_date.slice(0, 7));
      }
    });
    expenses.forEach(e => {
      if (e?.expense_date && typeof e.expense_date === 'string') {
        monthsSet.add(e.expense_date.slice(0, 7));
      }
    });
    tasks.forEach(t => {
      if (t?.completed_at && typeof t.completed_at === 'string') {
        monthsSet.add(t.completed_at.slice(0, 7));
      }
      if (t?.created_at && typeof t.created_at === 'string') {
        monthsSet.add(t.created_at.slice(0, 7));
      }
    });
    goalsHistory.forEach(h => {
      if (h?.date && typeof h.date === 'string') {
        monthsSet.add(h.date.slice(0, 7));
      }
    });

    // Sort descending (newest first)
    return Array.from(monthsSet).sort().reverse();
  }, [focusSessions, expenses, tasks, goalsHistory]);

  const currentMonthStr = useMemo(() => format(new Date(), 'yyyy-MM'), []);

  // Compute stats for all available months
  const monthlySummaries = useMemo(() => {
    return availableMonths.map(ym => {
      const data = calculateMonthlyReportData({
        expenses,
        tasks,
        focusSessions,
        savingsGoals,
        profile,
        goalsHistory,
        yearMonth: ym
      });
      return {
        yearMonth: ym,
        monthName: data.monthName,
        score: data.cover.productivityScore,
        isCurrent: ym === currentMonthStr
      };
    });
  }, [availableMonths, expenses, tasks, focusSessions, savingsGoals, profile, goalsHistory, currentMonthStr]);

  // Compute detailed report data if a month is selected
  const reportData = useMemo(() => {
    if (!selectedMonth) return null;
    return calculateMonthlyReportData({
      expenses,
      tasks,
      focusSessions,
      savingsGoals,
      profile,
      goalsHistory,
      yearMonth: selectedMonth
    });
  }, [selectedMonth, expenses, tasks, focusSessions, savingsGoals, profile, goalsHistory]);

  const handleShare = () => {
    alert("Share Card architecture ready. Future update will enable direct export to Twitter/LinkedIn/Slack!");
  };

  const handleExportPDF = () => {
    alert("PDF report layout prepared. Direct browser PDF download will be activated next.");
  };

  if (reportType === 'weekly') {
    return (
      <div className="space-y-6">
        <div className="flex gap-2 p-1 rounded-xl w-fit mb-6" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <button
            onClick={() => setReportType('weekly')}
            className="px-4 py-1.5 text-sm font-medium rounded-lg transition-all bg-purple-500/20 text-white border border-purple-500/30"
          >
            Weekly Report
          </button>
          <button
            onClick={() => setReportType('monthly')}
            className="px-4 py-1.5 text-sm font-medium rounded-lg transition-all text-slate-400 hover:text-white"
          >
            Monthly Report
          </button>
        </div>
        <WeeklyReport />
      </div>
    );
  }

  if (reportData) {
    return (
      <div className="page-enter space-y-8 pb-12">
        {/* Navigation / Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() => setSelectedMonth(null)}
            className="flex items-center gap-2 text-sm font-medium transition-all hover:translate-x-[-4px]"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={16} /> Back to Report History
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            >
              <Share2 size={14} /> Share Card
            </button>
            <button
              onClick={handleExportPDF}
              className="btn-neon px-4 py-2 text-xs font-semibold flex items-center gap-2"
            >
              <Download size={14} /> Export PDF
            </button>
          </div>
        </div>

        {/* Section 1: Monthly Cover */}
        <div
          className="glass-card p-6 sm:p-10 relative overflow-hidden text-center flex flex-col items-center justify-center min-h-[400px]"
          style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(236,72,153,0.08))',
            border: '1px solid rgba(168,85,247,0.25)',
          }}
        >
          <div
            className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-10"
            style={{ background: 'radial-gradient(circle, #a855f7, transparent)' }}
          />

          <span
            className="px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-4"
            style={{ background: 'rgba(168,85,247,0.2)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)' }}
          >
            Monthly Productivity Review
          </span>

          <h1
            className="text-4xl sm:text-6xl font-black mb-2 tracking-tight"
            style={{ fontFamily: 'Space Grotesk', color: 'var(--text-primary)' }}
          >
            {reportData.monthName}
          </h1>

          <p className="text-sm max-w-md mx-auto mb-8" style={{ color: 'var(--text-secondary)' }}>
            "{reportData.cover.quote}" <br />
            <span className="text-xs font-bold mt-1 block" style={{ color: '#a855f7' }}>— {reportData.cover.quoteAuthor}</span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-2xl mt-4">
            <div className="glass-card p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Productivity Score</p>
              <h2 className="text-3xl font-black gradient-text">{reportData.cover.productivityScore}%</h2>
            </div>
            <div className="glass-card p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Average Completion</p>
              <h2 className="text-3xl font-black" style={{ color: '#10b981' }}>{reportData.cover.completionPct}%</h2>
            </div>
            <div className="glass-card p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Total XP Earned</p>
              <h2 className="text-3xl font-black" style={{ color: '#fbbf24' }}>{reportData.cover.totalXP} XP</h2>
            </div>
          </div>
        </div>

        {/* Section 12: Monthly Journal (Featured Top-level Story) */}
        <div className="glass-card p-6" style={{ border: '1px solid rgba(6,182,212,0.15)' }}>
          <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <BookOpen size={18} style={{ color: '#06b6d4' }} /> Monthly Journal Summary
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {reportData.journal}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section 2: Focus Summary */}
          <div className="glass-card p-5 space-y-4">
            <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Brain size={18} style={{ color: '#a855f7' }} /> Focus Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryPill label="Total Focus" value={`${reportData.focus.totalHours}h`} />
              <SummaryPill label="Daily Average" value={`${reportData.focus.avgDailyMinutes}m`} />
              <SummaryPill label="Sessions Completed" value={reportData.focus.totalPomodoros} />
              <SummaryPill label="Longest Session" value={`${reportData.focus.longestSession}m`} />
            </div>

            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reportData.focus.focusTrend}>
                  <defs>
                    <linearGradient id="focusTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} />
                  <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} />
                  <Tooltip contentStyle={{ background: 'rgba(10,10,20,0.95)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 10, fontSize: 11 }} />
                  <Area type="monotone" dataKey="minutes" name="Focus (min)" stroke="#a855f7" fill="url(#focusTrendGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Section 3: Task Summary */}
          <div className="glass-card p-5 space-y-4">
            <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <CheckSquare size={18} style={{ color: '#10b981' }} /> Task Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryPill label="Completed" value={reportData.tasks.completed} />
              <SummaryPill label="All Pending" value={reportData.tasks.pending} />
              <SummaryPill label="Completion Rate" value={`${reportData.tasks.completionRate}%`} />
              <SummaryPill label="Daily Average" value={reportData.tasks.avgDailyTasks} />
            </div>

            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData.tasks.dailyCompletions}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} />
                  <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} />
                  <Tooltip contentStyle={{ background: 'rgba(10,10,20,0.95)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, fontSize: 11 }} />
                  <Bar dataKey="count" name="Tasks Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Section 4: Finance Summary */}
          <div className="glass-card p-5 space-y-4">
            <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Wallet size={18} style={{ color: '#ec4899' }} /> Finance Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryPill label="Total Spent" value={formatCurrency(reportData.finance.monthlySpending)} />
              <SummaryPill label="Budget Used" value={`${reportData.finance.budgetUsed}%`} />
              <SummaryPill label="Estimated Saved" value={formatCurrency(reportData.finance.moneySaved)} />
              <SummaryPill label="Budget Status" value={reportData.finance.budgetHealth} />
            </div>

            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reportData.finance.expenseTrend}>
                  <defs>
                    <linearGradient id="spendTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} />
                  <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} />
                  <Tooltip contentStyle={{ background: 'rgba(10,10,20,0.95)', border: '1px solid rgba(236,72,153,0.3)', borderRadius: 10, fontSize: 11 }} />
                  <Area type="monotone" dataKey="amount" name="Spent" stroke="#ec4899" fill="url(#spendTrendGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Section 5: Daily Goals Summary */}
          <div className="glass-card p-5 space-y-4">
            <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Target size={18} style={{ color: '#06b6d4' }} /> Daily Goals Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryPill label="Goals Completed" value={reportData.goals.completedCount} />
              <SummaryPill label="Completion %" value={`${reportData.goals.completionPct}%`} />
              <SummaryPill label="Best Goal Day" value={reportData.goals.bestDay} />
              <SummaryPill label="Missed Days" value={reportData.goals.missedDays} />
            </div>

            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData.goals.weeklyPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} />
                  <Tooltip contentStyle={{ background: 'rgba(10,10,20,0.95)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 10, fontSize: 11 }} />
                  <Bar dataKey="completed" name="Completed Goals" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Section 6 & 7: Rewards & Consistency Streaks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rewards */}
          <div className="glass-card p-5 space-y-4">
            <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Trophy size={18} style={{ color: '#fbbf24' }} /> Rewards Summary
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>XP Earned</span>
                <span className="text-sm font-bold" style={{ color: '#fbbf24' }}>+{reportData.rewards.xpEarned} XP</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Milestone Level Ups</span>
                <span className="text-sm font-bold" style={{ color: '#a855f7' }}>{reportData.rewards.levelUps} Levels</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Achievements Earned</span>
                <span className="text-sm font-bold" style={{ color: '#06b6d4' }}>{reportData.rewards.achievementsCount} Achievements</span>
              </div>
            </div>

            {reportData.rewards.badgesUnlocked.length > 0 && (
              <div>
                <p className="text-xs mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>Badges Unlocked</p>
                <div className="flex flex-wrap gap-2">
                  {reportData.rewards.badgesUnlocked.map(b => (
                    <div
                      key={b.id}
                      className="px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)' }}
                      title={b.name}
                    >
                      <span>{b.icon}</span>
                      <span style={{ color: 'var(--text-primary)' }}>{b.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Consistency Streak Heatmap */}
          <div className="glass-card p-5 space-y-4 lg:col-span-2">
            <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Flame size={18} style={{ color: '#f59e0b' }} /> Consistency & Activity Map
            </h3>
            <div className="flex items-center gap-6">
              <SummaryPill label="Longest Streak" value={`${reportData.streak.longestStreak}d`} />
              <SummaryPill label="Consistency %" value={`${reportData.streak.consistencyPct}%`} />
              <SummaryPill label="Missed Days" value={reportData.streak.missedDaysCount} />
            </div>

            {/* Heatmap Grid */}
            <div className="flex flex-wrap gap-1">
              {reportData.streak.heatmapData.map((day, idx) => {
                const active = day.focus > 0;
                const color = active ? 'rgba(168,85,247,0.45)' : 'rgba(255,255,255,0.04)';
                return (
                  <div
                    key={idx}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-all duration-300 hover:scale-105"
                    style={{
                      background: color,
                      border: `1px solid ${active ? 'rgba(168,85,247,0.35)' : 'rgba(255,255,255,0.06)'}`,
                      color: active ? 'white' : 'var(--text-muted)'
                    }}
                    title={`${day.date}: ${day.focus}m focus`}
                  >
                    {idx + 1}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 9: Timeline */}
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <TrendingUp size={18} style={{ color: '#a855f7' }} /> Chronological Monthly Timeline
          </h3>
          {reportData.timeline.length > 0 ? (
            <div className="relative border-l border-white/10 ml-4 pl-6 space-y-6">
              {reportData.timeline.map((event, idx) => (
                <div key={idx} className="relative">
                  <div
                    className="absolute -left-[37px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs border"
                    style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
                  >
                    {event.icon}
                  </div>
                  <div>
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{event.date}</span>
                    <h4 className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{event.title}</h4>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>No significant milestones recorded for this month.</p>
          )}
        </div>

        {/* Section 10 & 11: Achievements & Smart Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Achievements Highlight */}
          <div className="glass-card p-5 space-y-4">
            <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Award size={18} style={{ color: '#06b6d4' }} /> Achievements Unlocked
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {reportData.achievements.map((ach, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}
                >
                  <span className="text-2xl">{ach.icon}</span>
                  <div>
                    <h4 className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{ach.title}</h4>
                    <h3 className="text-base font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{ach.value}</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{ach.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Smart Insights */}
          <div className="glass-card p-5 space-y-4">
            <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Zap size={18} style={{ color: '#a855f7' }} /> Smart Insights & Tips
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {reportData.insights.map((ins, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl space-y-2"
                  style={{ background: `${ins.color}10`, border: `1px solid ${ins.color}20` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{ins.icon}</span>
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: ins.color }}>Key Indicator</p>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {ins.text}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="font-bold text-white">Advice:</span> {ins.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Performance Reports</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Review your long-term focus, tasks, and financial trends.</p>
        </div>
        <div className="flex gap-2 p-1 rounded-xl bg-white/5">
          <button
            onClick={() => setReportType('weekly')}
            className="px-4 py-1.5 text-sm font-medium rounded-lg transition-all text-slate-400 hover:text-white"
          >
            Weekly Report
          </button>
          <button
            onClick={() => setReportType('monthly')}
            className="px-4 py-1.5 text-sm font-medium rounded-lg transition-all bg-purple-500/20 text-white border border-purple-500/30"
          >
            Monthly Report
          </button>
        </div>
      </div>
      {/* Overview / Banner */}
      <div
        className="glass-card p-6 sm:p-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(6,182,212,0.08))' }}
      >
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #a855f7, transparent)', transform: 'translate(30%, -30%)' }}
        />
        <div className="relative z-10">
          <h2
            className="text-2xl sm:text-3xl font-black mb-2"
            style={{ fontFamily: 'Space Grotesk', color: 'var(--text-primary)' }}
          >
            Monthly Productivity Review
          </h2>
          <p className="text-sm max-w-xl" style={{ color: 'var(--text-secondary)' }}>
            Revisit your stats, track progress milestones, review financial budgets, and view personalized productivity summaries for each calendar month.
          </p>
        </div>
      </div>

      {/* History Grid */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Report History</h3>
        {monthlySummaries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {monthlySummaries.map((summary) => (
              <div
                key={summary.yearMonth}
                className="glass-card p-5 flex flex-col justify-between gap-4 transition-all duration-300 hover:scale-[1.02]"
                style={{ border: summary.isCurrent ? '1px solid rgba(168,85,247,0.3)' : '1px solid var(--border-color)' }}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-base" style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>
                      {summary.monthName}
                    </h4>
                    {summary.isCurrent && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}>
                        In Progress
                      </span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Productivity Score: <span className="font-semibold text-white">{summary.score}%</span>
                  </p>
                </div>

                <button
                  onClick={() => setSelectedMonth(summary.yearMonth)}
                  className="btn-neon w-full py-2 text-xs font-semibold flex items-center justify-center gap-2 mt-2"
                  style={{ borderRadius: 10 }}
                >
                  View Report <ArrowUpRight size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No report history found. Track your first activity to generate a report!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="text-lg font-black tracking-tight mt-1" style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>
        {value}
      </div>
    </div>
  );
}
