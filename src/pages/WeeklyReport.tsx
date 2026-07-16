import React, { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../lib/formatCurrency';
import { calculateProductivityScore } from '../lib/scoreUtils';
import { generateInsights } from '../lib/insightUtils';
import InsightCard from '../components/analytics/InsightCard';
import TrendChart from '../components/analytics/TrendChart';
import CategoryPieChart from '../components/analytics/CategoryPieChart';
import { startOfWeek, endOfWeek, subWeeks, format, isWithinInterval, parseISO } from 'date-fns';
import { Brain, CheckSquare, Wallet, Target, Trophy, TrendingUp } from 'lucide-react';
import { getTasksForDate } from '../lib/taskRecurrence';

export default function WeeklyReport() {
  const { expenses, tasks, focusSessions, taskCompletions, profile } = useStore();
  const [weekOffset, setWeekOffset] = useState(0);

  const reportData = useMemo(() => {
    const now = new Date();
    const startDate = startOfWeek(subWeeks(now, weekOffset));
    const endDate = endOfWeek(startDate);
    const dateRangeStr = `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;

    const isDateInWeek = (dateStr: string) => {
      try {
        const d = parseISO(dateStr);
        return isWithinInterval(d, { start: startDate, end: endDate });
      } catch {
        return false;
      }
    };

    // Filtered Data
    const weekExpenses = expenses.filter(e => isDateInWeek(e.expense_date));
    const weekSessions = focusSessions.filter(s => isDateInWeek(s.session_date));

    // Tasks 
    let completedTasks = 0;
    let pendingTasks = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dayTasks = getTasksForDate(tasks, d, taskCompletions);
      dayTasks.forEach(t => {
        if (t.completed) completedTasks++;
        else pendingTasks++;
      });
    }

    // Calculations
    const totalSpent = weekExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalMinutes = weekSessions.reduce((sum, s) => sum + s.minutes, 0);

    // Productivity Score
    const { score: prodScore, label: prodLabel } = calculateProductivityScore({
      tasks, // Send all tasks for score consistency for now
      focusSessions: weekSessions,
      profile
    });

    const smartInsights = generateInsights({ tasks, focusSessions: weekSessions, expenses: weekExpenses });

    // Focus Trend
    const focusTrendData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const mins = weekSessions
        .filter(s => s.session_date.startsWith(dateStr))
        .reduce((sum, s) => sum + s.minutes, 0);
      return { name: format(d, 'EEE'), focus: mins };
    });

    // Expenses Pie
    const categoryTotals = weekExpenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);
    const categoryData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));

    return {
      dateRangeStr,
      totalSpent,
      totalMinutes,
      completedTasks,
      pendingTasks,
      prodScore,
      prodLabel,
      smartInsights,
      focusTrendData,
      categoryData,
      hasNextWeek: weekOffset > 0,
      hasPrevWeek: weekOffset < 52 // Allow going back a year
    };
  }, [weekOffset, expenses, tasks, taskCompletions, focusSessions, profile]);

  return (
    <div className="page-enter space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Weekly Report</h1>
        <div className="flex items-center gap-4 bg-white/5 rounded-lg p-1 border border-white/10">
          <button 
            disabled={!reportData.hasPrevWeek}
            onClick={() => setWeekOffset(o => o + 1)}
            className="px-3 py-1 text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-30 transition"
          >
            &larr; Prev Week
          </button>
          <span className="text-xs font-bold text-purple-400">{reportData.dateRangeStr}</span>
          <button 
            disabled={!reportData.hasNextWeek}
            onClick={() => setWeekOffset(o => o - 1)}
            className="px-3 py-1 text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-30 transition"
          >
            Next Week &rarr;
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
        <div className="glass-card p-4">
          <span className="text-[10px] text-slate-500 block uppercase font-semibold">Total Focus</span>
          <span className="text-2xl font-black text-purple-400 mt-1 block">{Math.round(reportData.totalMinutes / 60 * 10) / 10}h</span>
        </div>
        <div className="glass-card p-4">
          <span className="text-[10px] text-slate-500 block uppercase font-semibold">Tasks Completed</span>
          <span className="text-2xl font-black text-cyan-400 mt-1 block">{reportData.completedTasks}</span>
        </div>
        <div className="glass-card p-4">
          <span className="text-[10px] text-slate-500 block uppercase font-semibold">Weekly Spend</span>
          <span className="text-2xl font-black text-pink-400 mt-1 block">{formatCurrency(reportData.totalSpent)}</span>
        </div>
        <div className="glass-card p-4">
          <span className="text-[10px] text-slate-500 block uppercase font-semibold">Productivity Score</span>
          <span className="text-2xl font-black text-green-400 mt-1 block">{reportData.prodScore}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-5">
          <h3 className="font-bold text-sm text-white flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-purple-400"/> Focus Trend
          </h3>
          <TrendChart data={reportData.focusTrendData} xKey="name" yKey="focus" color="#a855f7" height={250} />
        </div>

        <div className="glass-card p-5">
          <h3 className="font-bold text-sm text-white flex items-center gap-2 mb-4">
            <Wallet size={16} className="text-pink-400"/> Expenses Breakdown
          </h3>
          <CategoryPieChart data={reportData.categoryData} height={250} />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Weekly AI Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportData.smartInsights.length === 0 ? (
            <p className="text-sm text-slate-500">Not enough data to generate insights for this week.</p>
          ) : (
            reportData.smartInsights.map(insight => (
              <InsightCard key={insight.id} insight={insight} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
