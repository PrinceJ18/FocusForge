import React, { useMemo, useState } from 'react';
import { useStore, type FocusSession, type Expense, type TaskCompletion } from '../store/useStore';
import { useDailyGoalsStore } from '../store/useDailyGoalsStore';
import { calculateMonthlyReportData } from '../lib/statistics';
import { formatFocusTime, formatCurrency } from '../lib/formatUtils';
import {
  Brain, CheckSquare, Wallet, Target, Trophy, Flame, TrendingUp,
  ArrowLeft, ArrowUpRight, Award, Zap, BookOpen, Share2, Download,
  Printer, Lightbulb, ArrowUp, ArrowDown, Minus, Star, FileText, Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { logEvent } from '../lib/events';
import { useEffect } from 'react';
import WeeklyReport from './WeeklyReport';
import { CustomTooltip } from '../components/analytics/CustomTooltip';
import { exportCSV, printReport, shareReport, buildExportData } from '../lib/exportUtils';
import { useCoach } from '../hooks/useCoach';
import {
  ReportsExecutiveIntelligence,
  ReportsBehaviourAnalysis,
  ReportsPerformanceOutlook,
  ReportsStrategicRecommendations,
  ReportsRiskAssessment,
  ReportsPerformanceTimeline,
  ReportsExecutiveClosingSummary,
} from '../components/reports/ReportsCoachInsights';

const CATEGORY_COLORS: Record<string, string> = {
  food: '#f59e0b', transport: '#06b6d4', shopping: '#ec4899',
  entertainment: '#a855f7', health: '#10b981', education: '#3b82f6',
  utilities: '#6b7280', other: '#8b5cf6',
};

export default function Reports() {
  const expenses = useStore(s => s.expenses);
  const tasks = useStore(s => s.tasks);
  const focusSessions = useStore(s => s.focusSessions);
  const savingsGoals = useStore(s => s.savingsGoals);
  const profile = useStore(s => s.profile);
  const recurringExpenses = useStore(s => s.recurringExpenses);
  const setPage = useStore(s => s.setPage);
  const serverAvailableMonths = useStore(s => s.lifetimeAggregates.availableMonths);
  const { history: goalsHistory } = useDailyGoalsStore();
  const coach = useCoach();

  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Phase 5.6: Isolated historical cache
  const [historicalCache, setHistoricalCache] = useState<Record<string, {
    expenses: Expense[];
    focusSessions: FocusSession[];
    taskCompletions: TaskCompletion[];
  }>>({});
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedMonth) {
      logEvent('monthly_report_generated', 'reports', selectedMonth, {
        month: selectedMonth,
        description: `Generated Monthly Report for ${selectedMonth}`,
      });
    }
  }, [selectedMonth]);

  // Phase 5.4: Use server-side available months, merging localStorage-only goalsHistory months.
  // Falls back to full client-side scan if server aggregate is empty (e.g. new user or RPC failure).
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();

    // Server-side months (from get_available_months RPC — covers focus_sessions, expenses, tasks)
    if (serverAvailableMonths.length > 0) {
      serverAvailableMonths.forEach(m => monthsSet.add(m));
    } else {
      // Fallback: client-side scan (identical to previous implementation)
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
    }

    // Always merge goalsHistory months (localStorage-only, not covered by RPC)
    goalsHistory.forEach(h => {
      if (h?.date && typeof h.date === 'string') {
        monthsSet.add(h.date.slice(0, 7));
      }
    });

    // Sort descending (newest first)
    return Array.from(monthsSet).sort().reverse();
  }, [serverAvailableMonths, focusSessions, expenses, tasks, goalsHistory]);

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
        recurringExpenses,
        isCurrentMonth: ym === currentMonthStr,
        yearMonth: ym
      });
      return {
        yearMonth: ym,
        monthName: data.monthName,
        score: data.cover.productivityScore,
        isCurrent: ym === currentMonthStr
      };
    });
  }, [availableMonths, expenses, tasks, focusSessions, savingsGoals, profile, goalsHistory, recurringExpenses, currentMonthStr]);

  // Phase 5.6: Fetch missing historical data on-demand without mutating the 90-day store arrays
  const storeCompletions = useStore(s => s.taskCompletions);
  const user = useStore(s => s.user);

  const needsHistory = useMemo(() => {
    if (!selectedMonth) return false;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoffDateStr = format(cutoffDate, 'yyyy-MM-dd');

    const [y, m] = selectedMonth.split('-').map(Number);
    const prevM = m === 1 ? 12 : m - 1;
    const prevY = m === 1 ? y - 1 : y;
    const prevYearMonthStr = `${prevY}-${String(prevM).padStart(2, '0')}`;
    const prevMonthStart = `${prevYearMonthStr}-01`;

    // If the previous month starts before our 90-day cutoff, we need to fetch historical data
    return prevMonthStart < cutoffDateStr;
  }, [selectedMonth]);

  useEffect(() => {
    if (!selectedMonth || !needsHistory) return;
    if (historicalCache[selectedMonth]) return; // Already fetched

    const fetchHistory = async () => {
      setIsFetchingHistory(true);
      setHistoryError(null);
      try {
        const [y, m] = selectedMonth.split('-').map(Number);
        const prevM = m === 1 ? 12 : m - 1;
        const prevY = m === 1 ? y - 1 : y;
        const prevMonthStart = `${prevY}-${String(prevM).padStart(2, '0')}-01`;
        
        // Fetch up to the end of the selected month
        // m is already 1-indexed, so new Date(y, m, 1) points to the FIRST day of the NEXT month
        const nextDate = new Date(y, m, 1);
        const nextMonthStart = format(nextDate, 'yyyy-MM-dd');

        if (!user) throw new Error('User not authenticated.');

        const [expRes, sesRes, compRes] = await Promise.all([
          supabase.from('expenses').select('*').eq('user_id', user.id).gte('expense_date', prevMonthStart).lt('expense_date', nextMonthStart),
          supabase.from('focus_sessions').select('*').eq('user_id', user.id).gte('session_date', prevMonthStart).lt('session_date', nextMonthStart),
          supabase.from('task_completions').select('*').eq('user_id', user.id).gte('occurrence_date', prevMonthStart).lt('occurrence_date', nextMonthStart),
        ]);

        if (expRes.error) throw expRes.error;
        if (sesRes.error) throw sesRes.error;
        if (compRes.error) throw compRes.error;

        setHistoricalCache(prev => ({
          ...prev,
          [selectedMonth]: {
            expenses: expRes.data || [],
            focusSessions: sesRes.data || [],
            taskCompletions: compRes.data || []
          }
        }));
      } catch (err) {
        console.error('Failed to fetch historical report data:', err);
        setHistoryError(err instanceof Error ? err.message : 'Failed to load historical data');
      } finally {
        setIsFetchingHistory(false);
      }
    };
    fetchHistory();
  }, [selectedMonth, needsHistory, historicalCache, user]);

  // Compute detailed report data if a month is selected
  const reportData = useMemo(() => {
    if (!selectedMonth) return null;
    
    const hist = historicalCache[selectedMonth];
    if (needsHistory && !hist) return null; // loading or error state handled below

    return calculateMonthlyReportData({
      // Substitute isolated historical data if available; otherwise fallback to hydrated store
      expenses: hist ? hist.expenses : expenses,
      tasks: tasks, // tasks are inherently unbounded
      focusSessions: hist ? hist.focusSessions : focusSessions,
      taskCompletions: hist ? hist.taskCompletions : storeCompletions,
      savingsGoals,
      profile,
      goalsHistory,
      recurringExpenses,
      isCurrentMonth: selectedMonth === currentMonthStr,
      yearMonth: selectedMonth
    });
  }, [selectedMonth, historicalCache, needsHistory, expenses, tasks, focusSessions, storeCompletions, savingsGoals, profile, goalsHistory, recurringExpenses, currentMonthStr]);

  const handleShare = () => {
    if (!reportData) return;
    const exportData = buildExportData(reportData);
    shareReport(exportData);
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    const exportData = buildExportData(reportData);
    exportCSV(exportData);
    logEvent('report_exported', 'reports', 'csv', { month: selectedMonth });
  };

  const handlePrint = () => {
    printReport();
  };

  // ═══ Toggle: Weekly / Monthly selector ═══
  const ReportToggle = (
    <div className="tab-group">
      <button
        onClick={() => setReportType('weekly')}
        className={`tab-pill ${reportType === 'weekly' ? 'active' : ''}`}
      >
        Weekly
      </button>
      <button
        onClick={() => setReportType('monthly')}
        className={`tab-pill ${reportType === 'monthly' ? 'active' : ''}`}
      >
        Monthly
      </button>
    </div>
  );


  if (reportType === 'weekly') {
    return (
      <div className="page-enter space-y-6 text-left">
        {ReportToggle}
        <WeeklyReport />
      </div>
    );
  }

  // Phase 5.6: Loading and Error States for Historical Reports
  if (selectedMonth && needsHistory && isFetchingHistory) {
    return (
      <div className="page-enter space-y-6 text-left pb-12">
        {ReportToggle}
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
          <Loader2 size={32} className="animate-spin text-primary" style={{ color: '#06b6d4' }} />
          <h3 className="text-xl font-bold text-text-primary">Loading Historical Report...</h3>
          <p className="text-sm text-text-muted">Fetching historical data for {selectedMonth}</p>
        </div>
      </div>
    );
  }

  if (selectedMonth && needsHistory && historyError) {
    return (
      <div className="page-enter space-y-6 text-left pb-12">
        {ReportToggle}
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <FileText size={32} />
          </div>
          <h3 className="text-xl font-bold text-text-primary">Failed to load report</h3>
          <p className="text-sm text-text-muted">{historyError}</p>
          <Button variant="primary" onClick={() => setSelectedMonth(null)}>
            Return to Reports
          </Button>
        </div>
      </div>
    );
  }

  if (reportData) {
    return (
      <div className="page-enter space-y-6 text-left pb-12">
        {ReportToggle}
        {/* Navigation + Export Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
          <button
            onClick={() => setSelectedMonth(null)}
            className="flex items-center gap-2 text-sm font-medium transition-all hover:translate-x-[-4px]"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={16} /> Back to Report History
          </button>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExportCSV} className="py-2 text-xs font-semibold" icon={Download}>
              Export CSV
            </Button>
            <Button variant="outline" onClick={handlePrint} className="py-2 text-xs font-semibold" icon={Printer}>
              Print
            </Button>
            <Button variant="outline" onClick={handleShare} className="py-2 text-xs font-semibold" icon={Share2}>
              Share
            </Button>
          </div>
        </div>

        {/* ═══ SECTION 1: Executive Report Header ═══ */}
        <div
          className="report-executive-header glass-card p-6 sm:p-8 relative overflow-hidden"
          role="region" aria-label="Executive Report Header"
          style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(236,72,153,0.06))',
            border: `1px solid ${reportData.gradeColor}30`,
          }}
        >
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-10" style={{ background: `radial-gradient(circle, ${reportData.gradeColor}, transparent)` }} />

          <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
            {/* Grade Badge */}
            <div
              className="report-grade-badge"
              style={{ borderColor: `${reportData.gradeColor}40`, color: reportData.gradeColor }}
            >
              <span className="text-4xl font-black" style={{ fontFamily: 'Space Grotesk' }}>{reportData.grade}</span>
              <span className="text-[10px] uppercase tracking-widest font-bold mt-1" style={{ color: 'var(--text-muted)' }}>Grade</span>
            </div>

            {/* Report Info */}
            <div className="flex-1 text-center sm:text-left">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase inline-block mb-2" style={{ background: `${reportData.gradeColor}15`, color: reportData.gradeColor, border: `1px solid ${reportData.gradeColor}25` }}>
                Monthly Performance Report
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ fontFamily: 'Space Grotesk', color: 'var(--text-primary)' }}>
                {reportData.monthName}
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Overall Score: <span className="font-bold" style={{ color: reportData.gradeColor }}>{reportData.overallScore}/100</span>
              </p>
            </div>

            {/* KPI Mini Cards */}
            <div className="grid grid-cols-3 gap-3 flex-shrink-0 w-full sm:w-auto">
              <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Score</div>
                <div className="text-lg font-black mt-0.5" style={{ color: reportData.gradeColor, fontFamily: 'Space Grotesk' }}>{reportData.cover.productivityScore}%</div>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Tasks</div>
                <div className="text-lg font-black mt-0.5" style={{ color: '#10b981', fontFamily: 'Space Grotesk' }}>{reportData.tasks.completionRate}%</div>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>XP</div>
                <div className="text-lg font-black mt-0.5" style={{ color: '#fbbf24', fontFamily: 'Space Grotesk' }}>{reportData.cover.totalXP}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ SECTION 2: Executive Summary ═══ */}
        <div className="glass-card p-5" role="region" aria-label="Executive Summary" style={{ border: '1px solid rgba(6,182,212,0.15)' }}>
          <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <FileText size={18} style={{ color: '#06b6d4' }} /> Executive Summary
          </h3>
          <ul className="space-y-2">
            {reportData.executiveSummary.map((sentence, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#06b6d4' }} />
                {sentence}
              </li>
            ))}
          </ul>
        </div>

        {/* ═══ SECTION 1: Executive Intelligence (Phase 3.10D) ═══ */}
        <ReportsExecutiveIntelligence coach={coach} />

        {/* ═══ SECTION 6 & 7: Wins + Improvements ═══ */}
        {(reportData.wins.length > 0 || reportData.improvements.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Wins */}
            {reportData.wins.length > 0 && (
              <div className="glass-card p-5" role="region" aria-label="Wins">
                <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Star size={18} style={{ color: '#10b981' }} /> Top Wins
                </h3>
                <div className="space-y-2.5">
                  {reportData.wins.map((win, idx) => (
                    <div key={idx} className="report-win-card" style={{ borderLeftColor: win.color }}>
                      <span className="text-xl flex-shrink-0">{win.icon}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{win.title}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{win.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Improvements */}
            {reportData.improvements.length > 0 && (
              <div className="glass-card p-5" role="region" aria-label="Areas for Improvement">
                <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <TrendingUp size={18} style={{ color: '#f59e0b' }} /> Needs Improvement
                </h3>
                <div className="space-y-2.5">
                  {reportData.improvements.map((imp, idx) => (
                    <div key={idx} className="report-improvement-card" style={{ borderLeftColor: imp.color }}>
                      <span className="text-xl flex-shrink-0">{imp.icon}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{imp.title}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{imp.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ SECTION 9: Period Comparison ═══ */}
        <div className="glass-card p-5" role="region" aria-label="Period Comparison">
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <TrendingUp size={18} style={{ color: '#a855f7' }} /> vs Previous Month
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Focus', growth: reportData.comparison.focusGrowth, current: formatFocusTime(reportData.focus.totalMinutes), prev: formatFocusTime(reportData.comparison.prevFocusMinutes) },
              { label: 'Tasks', growth: reportData.comparison.taskGrowth, current: String(reportData.tasks.completed), prev: String(reportData.comparison.prevTasksCompleted) },
              { label: 'Spending', growth: reportData.comparison.spendingChange, current: formatCurrency(reportData.finance.monthlySpending), prev: formatCurrency(reportData.comparison.prevSpending), isInverse: true },
              { label: 'XP', growth: reportData.comparison.xpGrowth, current: `${reportData.cover.totalXP}`, prev: `${reportData.comparison.prevXP}` },
            ].map(item => {
              const isPositive = item.isInverse ? item.growth < 0 : item.growth > 0;
              const isNeutral = item.growth === 0;
              const color = isNeutral ? 'var(--text-muted)' : isPositive ? '#10b981' : '#ef4444';
              const GrowthIcon = isNeutral ? Minus : isPositive ? ArrowUp : ArrowDown;
              return (
                <div key={item.label} className="report-comparison-card">
                  <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>{item.label}</div>
                  <div className="text-lg font-black mt-1" style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>{item.current}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <GrowthIcon size={12} style={{ color }} />
                    <span className="text-[10px] font-bold" style={{ color }}>{item.growth > 0 ? '+' : ''}{item.growth}%</span>
                  </div>
                  <div className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>prev: {item.prev}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ SECTION 8: AI Recommendations ═══ */}
        {reportData.recommendations.length > 0 && (
          <div className="glass-card p-5" role="region" aria-label="AI Recommendations">
            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Lightbulb size={18} style={{ color: '#f59e0b' }} /> Recommendations
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {reportData.recommendations.map((rec, idx) => (
                <div key={idx} className="smart-rec-card" style={{ borderLeftColor: rec.color }}>
                  <span className="text-xl flex-shrink-0">{rec.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{rec.text}</div>
                  </div>
                  <span className="smart-rec-priority" style={{ background: `${rec.color}15`, color: rec.color }}>{rec.priority}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ Monthly Journal ═══ */}
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
              <SummaryPill label="Total Focus" value={formatFocusTime(reportData.focus.totalMinutes)} />
              <SummaryPill label="Daily Average" value={formatFocusTime(reportData.focus.avgDailyMinutes)} />
              <SummaryPill label="Sessions Completed" value={reportData.focus.totalPomodoros} />
              <SummaryPill label="Longest Session" value={formatFocusTime(reportData.focus.longestSession)} />
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
              {reportData.finance.budgetCommittedPct !== undefined && selectedMonth === currentMonthStr ? (
                <SummaryPill 
                  label="Budget Committed" 
                  value={profile.monthly_budget > 0 ? `${reportData.finance.budgetCommittedPct}%` : 'Unbudgeted'} 
                  color={reportData.finance.budgetCommittedPct > 80 && profile.monthly_budget > 0 ? '#ef4444' : '#10b981'} 
                />
              ) : (
                <SummaryPill label="Budget Spent" value={profile.monthly_budget > 0 ? `${reportData.finance.budgetSpentPct}%` : 'Unbudgeted'} />
              )}
              {reportData.finance.budgetDeficit !== undefined && reportData.finance.budgetDeficit > 0 && selectedMonth === currentMonthStr ? (
                <SummaryPill label="Budget Deficit" value={formatCurrency(reportData.finance.budgetDeficit)} color="#ef4444" />
              ) : (
                <SummaryPill label="Estimated Saved" value={formatCurrency(reportData.finance.moneySaved)} />
              )}
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
                      style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)' }}
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
            <div className="relative border-l border-border ml-4 pl-6 space-y-6">
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
                    <span className="font-bold text-text-primary">Advice:</span> {ins.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ SECTION 2: Behaviour Analysis (Phase 3.10D) ═══ */}
        <ReportsBehaviourAnalysis coach={coach} />

        {/* ═══ SECTION 3: Performance Outlook (Phase 3.10D) ═══ */}
        <ReportsPerformanceOutlook coach={coach} />

        {/* ═══ SECTION 4: Strategic Recommendations (Phase 3.10D) ═══ */}
        <ReportsStrategicRecommendations coach={coach} />

        {/* ═══ SECTION 5: Risk Assessment (Phase 3.10D) ═══ */}
        <ReportsRiskAssessment coach={coach} />

        {/* ═══ SECTION 6: Performance Timeline (Phase 3.10D) ═══ */}
        <ReportsPerformanceTimeline coach={coach} />

        {/* ═══ SECTION 7: Executive Closing Summary (Phase 3.10D) ═══ */}
        <ReportsExecutiveClosingSummary coach={coach} />
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6 text-left">
      {ReportToggle}

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
                    Productivity Score: <span className="font-semibold text-text-primary">{summary.score}%</span>
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
          <EmptyState
            icon={BookOpen}
            title="No report history found"
            description="Complete focus sessions or log expenses to generate your first performance report."
            action={{
              label: "Start Focus Session",
              onClick: () => setPage('productivity'),
              icon: Brain,
            }}
          />
        )}
      </div>
    </div>
  );
}

function SummaryPill({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="text-lg font-black tracking-tight mt-1" style={{ color: color || 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>
        {value}
      </div>
    </div>
  );
}
