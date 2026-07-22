import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Sparkles, Award, Timer, CheckSquare, Zap, Calendar, BarChart3,
  TrendingUp, Lightbulb, Activity, PiggyBank, Flame, Brain, Shield,
  Wallet, Target, Plus, Play
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '../../lib/formatCurrency';

import DashboardWidget from './DashboardWidget';
import KpiCard from './KpiCard';
import InsightCard from '../analytics/InsightCard';
import TrendChart from '../analytics/TrendChart';

// Import Types
import { Task, RecurringExpense } from '../../store/useStore';

export type WidgetCategory = 'Overview' | 'Productivity' | 'Finance' | 'Analytics' | 'Insights';

export interface WidgetLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

export interface DashboardContextData {
  profile: any;
  user: any;
  stats: any;
  greeting: string;
  displayName: string;
  levelInfo: any;
  estimatedTimeLeft: number;
  productivityScore: number;
  prodLabel: string;
  financialScore: number;
  finLabel: string;
  smartInsights: any[];
  focusTrendData: any[];
  expenseTrendData: any[];
  recommendations: string[];
  productivityScoreExplanation: any;
  achievementsPreview: any;
  upcomingBills: RecurringExpense[];
  recentEvents: any[];
  savingsSummary: any;
  todayExpensesAmount: number;
  budgetRemaining: number;
  todayCompletedCount: number;
  todayTaskOccurrences: any[];
  todayDate: Date;
  preferences: any;
  taskSections: any[];
  
  // Actions
  setShowCustomize: (show: boolean) => void;
  setPage: (page: any) => void;
  setShowQuickAddTask: (show: boolean) => void;
  setShowQuickAddExpense: (show: boolean) => void;
  handleStartTimer: (mins: number) => void;
  handleToggleTask: (task: Task, completed: boolean, dateStr: string) => void;
  setSelectedTaskDetails: (details: any) => void;
  getScoreColor: (score: number) => string;
}

export interface WidgetProps {
  context: DashboardContextData;
  layout: WidgetLayout;
}

export interface WidgetConfig {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  component: React.FC<WidgetProps>;
  defaultSize: { w: number; h: number; colSpan?: number };
  defaultOrder: number;
  category: WidgetCategory;
  defaultVisible: boolean;
  minimumSize: { w: number; h: number };
  maximumSize: { w: number; h: number };
}

// ----------------------------------------------------
// WIDGET COMPONENTS
// ----------------------------------------------------

const HeroWidget: React.FC<WidgetProps> = ({ context }) => {
  const { greeting, displayName, levelInfo, profile, todayDate, setShowCustomize, stats, todayCompletedCount, todayTaskOccurrences, budgetRemaining } = context;

  const focusMinutes = stats.todayMinutes ?? 0;
  const streak = profile.streak ?? 0;
  const tasksTotal = todayTaskOccurrences?.length ?? 0;
  const tasksDone = todayCompletedCount ?? 0;

  const heroStats = [
    { icon: Timer, label: "Today's Focus", value: `${focusMinutes} min`, color: '#a855f7' },
    { icon: CheckSquare, label: "Today's Tasks", value: `${tasksDone} / ${tasksTotal}`, color: '#06b6d4' },
    { icon: Wallet, label: 'Budget Remaining', value: formatCurrency(budgetRemaining ?? 0), color: '#10b981' },
    { icon: Flame, label: 'Current Streak', value: `${streak} ${streak === 1 ? 'Day' : 'Days'}`, color: '#f59e0b' },
  ];

  return (
    <DashboardWidget
      icon={Sparkles}
      title="Dashboard"
      badge={format(todayDate, 'EEE, MMM d')}
      size="hero"
      colSpan={12}
      gradient="linear-gradient(135deg, rgba(168,85,247,0.12), rgba(236,72,153,0.06), rgba(6,182,212,0.05))"
      iconBg="rgba(168,85,247,0.2)"
      iconColor="#a855f7"
      headerAction={
        <button
          onClick={() => setShowCustomize(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg text-xs font-semibold backdrop-blur-sm transition-all"
        >
          Customize
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Greeting + Profile row */}
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl font-black"
            style={{
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              boxShadow: '0 0 24px rgba(168,85,247,0.3)',
              color: 'white',
            }}
          >
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full rounded-2xl object-cover" />
              : displayName.charAt(0).toUpperCase()
            }
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>
              {greeting}, {displayName}! 👋
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Level {levelInfo.level} • {levelInfo.title} — {profile.xp} XP Total
            </p>
          </div>
        </div>

        {/* Daily summary chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {heroStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                style={{
                  background: `${stat.color}08`,
                  border: `1px solid ${stat.color}18`,
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${stat.color}15`, color: stat.color }}
                >
                  <Icon size={14} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider leading-tight truncate">{stat.label}</div>
                  <div className="text-xs font-bold text-white leading-tight mt-0.5">{stat.value}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardWidget>
  );
};

const KpiMetricsWidget: React.FC<WidgetProps> = ({ context }) => {
  const { levelInfo, profile, productivityScore, prodLabel, financialScore, finLabel, budgetRemaining, getScoreColor } = context;
  const streak = profile.streak ?? 0;
  return (
    <>
      <KpiCard
        icon={Award}
        title={levelInfo.title}
        value={`Level ${levelInfo.level}`}
        valueColor={levelInfo.color}
        iconBg={`${levelInfo.color}1a`}
        iconColor={levelInfo.color}
        colSpan={3}
        progressBar={{ value: levelInfo.progress, max: 100, gradient: `linear-gradient(90deg, ${levelInfo.color}, #ec4899)` }}
        footer={`${levelInfo.xpToNext} XP to Level ${levelInfo.level + 1}`}
      />
      <KpiCard
        icon={Flame}
        title="Day Streak"
        value={`${streak} ${streak === 1 ? 'Day' : 'Days'}`}
        valueColor="#f59e0b"
        iconBg="rgba(245,158,11,0.15)"
        iconColor="#f59e0b"
        colSpan={3}
        badge={streak >= 7 ? { label: '🔥 On Fire!', color: '#f59e0b' } : streak >= 3 ? { label: 'Building!', color: '#06b6d4' } : undefined}
        footer={streak === 0 ? 'Start your streak today!' : streak === 1 ? 'Keep it going!' : 'Continue your amazing streak!'}
      />
      <KpiCard
        icon={Brain}
        title="Productivity Score"
        value={`${productivityScore}%`}
        valueColor={getScoreColor(productivityScore)}
        iconBg={`${getScoreColor(productivityScore)}1a`}
        iconColor={getScoreColor(productivityScore)}
        colSpan={3}
        progressRing={{ value: productivityScore, max: 100, color: getScoreColor(productivityScore) }}
        badge={{ label: prodLabel, color: getScoreColor(productivityScore) }}
      />
      <KpiCard
        icon={Shield}
        title="Financial Health"
        value={`${financialScore}%`}
        valueColor={getScoreColor(financialScore)}
        iconBg={`${getScoreColor(financialScore)}1a`}
        iconColor={getScoreColor(financialScore)}
        colSpan={3}
        progressRing={{ value: financialScore, max: 100, color: getScoreColor(financialScore) }}
        badge={{ label: finLabel, color: getScoreColor(financialScore) }}
        footer={`Budget: ${formatCurrency(budgetRemaining)} left`}
      />
    </>
  );
};

const SnapshotWidget: React.FC<WidgetProps> = ({ context }) => {
  const { stats, preferences, estimatedTimeLeft, todayCompletedCount, todayTaskOccurrences, todayExpensesAmount, budgetRemaining, profile, setPage } = context;
  const monthlySpent = profile.monthly_budget - budgetRemaining;
  const focusMinutesToday = stats.todayMinutes ?? 0;
  return (
    <>
      <h2 className="dashboard-section-title w-full col-span-12">Today's Snapshot</h2>
      <KpiCard
        icon={Timer}
        title="Focus Time"
        value={`${focusMinutesToday} min`}
        valueColor="#a855f7"
        iconBg="rgba(168,85,247,0.15)"
        iconColor="#a855f7"
        colSpan={3}
        progressBar={{ value: focusMinutesToday, max: preferences.default_daily_focus_goal || 120, gradient: 'linear-gradient(90deg, #a855f7, #7c3aed)' }}
        footer={estimatedTimeLeft > 0 ? `${estimatedTimeLeft} min remaining` : 'Daily goal reached! 🎉'}
        onClick={() => setPage('productivity')}
      />
      <KpiCard
        icon={CheckSquare}
        title="Tasks Completed"
        value={`${todayCompletedCount}/${todayTaskOccurrences.length}`}
        valueColor="#06b6d4"
        iconBg="rgba(6,182,212,0.15)"
        iconColor="#06b6d4"
        colSpan={3}
        progressBar={{ value: todayCompletedCount, max: Math.max(1, todayTaskOccurrences.length), gradient: 'linear-gradient(90deg, #06b6d4, #0891b2)' }}
        onClick={() => setPage('productivity')}
      />
      <KpiCard
        icon={Wallet}
        title="Spent Today"
        value={formatCurrency(todayExpensesAmount)}
        valueColor="#ec4899"
        iconBg="rgba(236,72,153,0.15)"
        iconColor="#ec4899"
        colSpan={3}
        onClick={() => setPage('finance')}
      />
      {profile.monthly_budget > 0 ? (
        <KpiCard
          icon={Target}
          title="Budget Remaining"
          value={formatCurrency(budgetRemaining)}
          valueColor={budgetRemaining >= 0 ? '#10b981' : '#ef4444'}
          iconBg={budgetRemaining >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}
          iconColor={budgetRemaining >= 0 ? '#10b981' : '#ef4444'}
          colSpan={3}
          progressBar={{ value: Math.min(monthlySpent, profile.monthly_budget), max: Math.max(1, profile.monthly_budget), gradient: budgetRemaining >= 0 ? 'linear-gradient(90deg, #10b981, #06b6d4)' : 'linear-gradient(90deg, #ef4444, #f59e0b)' }}
          footer={`${Math.round((monthlySpent / profile.monthly_budget) * 100)}% of budget used`}
          onClick={() => setPage('finance')}
        />
      ) : (
        <DashboardWidget size="kpi" colSpan={3} icon={Target} title="Budget Remaining" iconBg="rgba(16,185,129,0.12)" iconColor="#10b981">
          <div className="flex flex-col items-center justify-center h-full text-center mt-[-8px]">
            <p className="text-[11px] text-slate-400 mb-2">Create your first monthly budget.</p>
            <button onClick={() => setPage('finance')} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition-colors">
              Create Budget
            </button>
          </div>
        </DashboardWidget>
      )}
    </>
  );
};

const QuickActionsWidget: React.FC<WidgetProps> = ({ context }) => {
  const { handleStartTimer, setShowQuickAddTask, setShowQuickAddExpense, setPage } = context;
  return (
    <>
      <h2 className="dashboard-section-title w-full col-span-12">Quick Actions</h2>
      <DashboardWidget
        icon={Zap}
        title="Command Center"
        colSpan={12}
        iconBg="rgba(168,85,247,0.12)"
        iconColor="#a855f7"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button onClick={() => handleStartTimer(25)} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-purple-500/8 border border-purple-500/15 hover:bg-purple-500/15 hover:border-purple-500/30 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play size={20} className="text-purple-400" />
            </div>
            <span className="text-xs font-bold text-purple-400">Start Focus</span>
          </button>
          <button onClick={() => setShowQuickAddTask(true)} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-cyan-500/8 border border-cyan-500/15 hover:bg-cyan-500/15 hover:border-cyan-500/30 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus size={20} className="text-cyan-400" />
            </div>
            <span className="text-xs font-bold text-cyan-400">Add Task</span>
          </button>
          <button onClick={() => setShowQuickAddExpense(true)} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-pink-500/8 border border-pink-500/15 hover:bg-pink-500/15 hover:border-pink-500/30 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wallet size={20} className="text-pink-400" />
            </div>
            <span className="text-xs font-bold text-pink-400">Add Expense</span>
          </button>
          <button onClick={() => setPage('finance')} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-500/8 border border-green-500/15 hover:bg-green-500/15 hover:border-green-500/30 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
              <PiggyBank size={20} className="text-green-400" />
            </div>
            <span className="text-xs font-bold text-green-400">Savings Goal</span>
          </button>
        </div>
      </DashboardWidget>
    </>
  );
};

const TodaysTasksWidget: React.FC<WidgetProps> = ({ context }) => {
  const { todayTaskOccurrences, setShowQuickAddTask, setPage, handleToggleTask, setSelectedTaskDetails, taskSections } = context;
  return (
    <>
      <h2 className="dashboard-section-title w-full col-span-12">Today's Work</h2>
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
            <button onClick={() => setShowQuickAddTask(true)} className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 rounded-lg text-xs font-semibold">Quick Add</button>
            <button onClick={() => setPage('productivity')} className="px-3 py-1.5 bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold">Manage Board</button>
          </div>
        }
      >
        <div className="space-y-2">
          {todayTaskOccurrences.length === 0 ? (
            <div className="text-center py-10 px-4 flex flex-col items-center justify-center h-full">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-3">
                <CheckSquare size={24} className="text-purple-400" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">🎉 You're all caught up!</h3>
              <p className="text-xs text-slate-400 mb-4 max-w-[200px] mx-auto">Enjoy your free time or create a new task.</p>
              <button onClick={() => setShowQuickAddTask(true)} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-colors">
                + Add Task
              </button>
            </div>
          ) : (
            todayTaskOccurrences.map(({ task, completed, occurrenceDate }) => {
              const section = taskSections.find((s) => s.id === task.section_id);
              const isHigh = task.priority === 'high';
              const isMed = task.priority === 'medium';
              const priorityColor = isHigh ? '#ef4444' : isMed ? '#f59e0b' : '#10b981';

              return (
                <div key={`${task.id}_${occurrenceDate}`} onClick={() => setSelectedTaskDetails({ task, completed, date: occurrenceDate })} className="p-3 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs">
                  <button onClick={(e) => { e.stopPropagation(); handleToggleTask(task, completed, occurrenceDate); }} className="text-gray-400 hover:text-white transition-colors" style={{ color: completed ? '#10b981' : 'var(--text-muted)' }}>
                    {completed ? <CheckSquare size={16} className="text-green-500" /> : <div className="w-4 h-4 rounded border border-white/20 hover:border-purple-400 transition-colors" />}
                  </button>
                  <div className="flex-1 min-w-0 text-left">
                    <span className="font-semibold text-white block truncate" style={{ textDecoration: completed ? 'line-through' : 'none', color: completed ? 'rgba(255,255,255,0.4)' : 'white' }}>{task.title}</span>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase" style={{ backgroundColor: `${priorityColor}15`, color: priorityColor }}>{task.priority}</span>
                      {section && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${section.color}15`, color: section.color }}>{section.name}</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DashboardWidget>
    </>
  );
};

const UpcomingBillsWidget: React.FC<WidgetProps> = ({ context }) => {
  const { upcomingBills, setPage } = context;
  return (
    <DashboardWidget
      icon={Calendar}
      title="Upcoming Bills"
      badge={`${upcomingBills.length}`}
      size="large"
      colSpan={4}
      scrollable
      iconBg="rgba(236,72,153,0.12)"
      iconColor="#ec4899"
      headerAction={<button onClick={() => setPage('finance')} className="px-3 py-1.5 bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold">View All</button>}
    >
      <div className="space-y-2">
        {upcomingBills.length === 0 ? (
          <div className="text-center py-10 px-4 flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/10 flex items-center justify-center mb-3">
              <Calendar size={24} className="text-pink-400" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">No upcoming payments.</h3>
            <p className="text-xs text-slate-400">You're all clear.</p>
          </div>
        ) : (
          upcomingBills.map(bill => (
            <div key={bill.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 group hover:bg-white/[0.04] transition-colors cursor-pointer" onClick={() => setPage('finance')}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm flex-shrink-0" style={{ color: bill.color, border: `1px solid ${bill.color}30` }}>{bill.icon}</div>
                <div className="min-w-0 flex-1"><div className="text-xs font-bold text-white group-hover:text-pink-400 transition-colors truncate">{bill.name}</div><div className="text-[10px] text-slate-400">Due: {format(parseISO(bill.payment_date), 'MMM d')}</div></div>
              </div>
              <div className="text-sm font-bold text-white font-mono">{formatCurrency(bill.amount)}</div>
            </div>
          ))
        )}
      </div>
    </DashboardWidget>
  );
};

const FocusTrendWidget: React.FC<WidgetProps> = ({ context }) => {
  const { focusTrendData, setPage, handleStartTimer } = context;
  const hasFocus = focusTrendData && focusTrendData.some(d => d.focus > 0);
  return (
    <>
      <h2 className="dashboard-section-title w-full col-span-12">Analytics & Insights</h2>
      <DashboardWidget icon={BarChart3} title="Focus Trend" size="medium" colSpan={6} iconBg="rgba(168,85,247,0.12)" iconColor="#a855f7" headerAction={<button onClick={() => setPage('analytics')} className="px-3 py-1.5 bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold">Details</button>}>
        {!hasFocus ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-3">
              <Play size={24} className="text-purple-400" />
            </div>
            <p className="text-xs text-slate-400 mb-4 max-w-[200px]">Start your first focus session today.</p>
            <button onClick={() => handleStartTimer(25)} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-colors">
              Start Focus
            </button>
          </div>
        ) : (
          <TrendChart data={focusTrendData} xKey="name" yKey="focus" color="#a855f7" height={160} />
        )}
      </DashboardWidget>
    </>
  );
};

const ExpenseTrendWidget: React.FC<WidgetProps> = ({ context }) => {
  const { expenseTrendData, setPage, setShowQuickAddExpense } = context;
  const hasExpense = expenseTrendData && expenseTrendData.some(d => d.spent > 0);
  return (
    <DashboardWidget icon={TrendingUp} title="Expense Trend" size="medium" colSpan={6} iconBg="rgba(236,72,153,0.12)" iconColor="#ec4899" headerAction={<button onClick={() => setPage('analytics')} className="px-3 py-1.5 bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold">Details</button>}>
      {!hasExpense ? (
        <div className="flex flex-col items-center justify-center h-full text-center py-6">
          <div className="w-12 h-12 rounded-2xl bg-pink-500/10 flex items-center justify-center mb-3">
            <Wallet size={24} className="text-pink-400" />
          </div>
          <p className="text-xs text-slate-400 mb-4 max-w-[200px]">Track your first expense to unlock financial insights.</p>
          <button onClick={() => setShowQuickAddExpense(true)} className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold transition-colors">
            + Add Expense
          </button>
        </div>
      ) : (
        <TrendChart data={expenseTrendData} xKey="name" yKey="spent" color="#ec4899" height={160} />
      )}
    </DashboardWidget>
  );
};

const AiInsightsWidget: React.FC<WidgetProps> = ({ context }) => {
  const { smartInsights } = context;
  return (
    <DashboardWidget icon={Lightbulb} title="AI Insights" badge="Beta" colSpan={6} scrollable iconBg="rgba(245,158,11,0.12)" iconColor="#f59e0b">
      <div className="space-y-2 h-full">
        {smartInsights.length === 0 ? (
          <div className="text-center py-6 px-4 flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-3">
              <Lightbulb size={24} className="text-amber-400" />
            </div>
            <p className="text-xs text-slate-400 max-w-[200px] mx-auto">Continue using FocusForge. We'll generate personalized insights automatically.</p>
          </div>
        ) : (
          smartInsights.slice(0, 3).map((insight, idx) => <InsightCard key={idx} insight={insight} />)
        )}
      </div>
    </DashboardWidget>
  );
};

const RecentActivityWidget: React.FC<WidgetProps> = ({ context }) => {
  const { recentEvents } = context;
  return (
    <DashboardWidget icon={Activity} title="Recent Activity" colSpan={6} scrollable iconBg="rgba(16,185,129,0.12)" iconColor="#10b981">
      <div className="space-y-0 relative">
        {recentEvents.length === 0 ? (
          <div className="text-center py-6 px-4 flex flex-col items-center justify-center h-full min-h-[140px]">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
              <Activity size={24} className="text-emerald-400" />
            </div>
            <p className="text-xs text-slate-400 max-w-[200px] mx-auto">Complete your first task or focus session. Your timeline will appear here.</p>
          </div>
        ) : (
          recentEvents.map((e, idx) => (
            <div key={e.id} className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
              <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                <div className="w-2 h-2 rounded-full" style={{ background: e.category === 'tasks' ? '#06b6d4' : e.category === 'focus' ? '#a855f7' : '#ec4899' }} />
                {idx < recentEvents.length - 1 && <div className="w-px h-full bg-white/5 mt-1" style={{ minHeight: 16 }} />}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-white block font-semibold truncate">{e.metadata.title || e.type}</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-slate-500">{format(parseISO(e.timestamp), 'h:mm a')}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ background: e.category === 'tasks' ? 'rgba(6,182,212,0.1)' : e.category === 'focus' ? 'rgba(168,85,247,0.1)' : 'rgba(236,72,153,0.1)', color: e.category === 'tasks' ? '#06b6d4' : e.category === 'focus' ? '#a855f7' : '#ec4899' }}>{e.category}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardWidget>
  );
};

const SavingsWidget: React.FC<WidgetProps> = ({ context }) => {
  const { savingsSummary, setPage } = context;
  return (
    <>
      <h2 className="dashboard-section-title w-full col-span-12">Savings</h2>
      <DashboardWidget icon={PiggyBank} title="Savings Progress" badge={savingsSummary ? `${savingsSummary.count} goal${savingsSummary.count !== 1 ? 's' : ''}` : '0'} colSpan={12} iconBg="rgba(16,185,129,0.12)" iconColor="#10b981" headerAction={<button onClick={() => setPage('finance')} className="px-3 py-1.5 bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold">Manage</button>}>
        {!savingsSummary ? (
          <div className="text-center py-6 px-4 flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
              <PiggyBank size={24} className="text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">No savings goal</h3>
            <p className="text-xs text-slate-400 mb-4 max-w-[200px] mx-auto">Start saving for something meaningful.</p>
            <button onClick={() => setPage('finance')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors">
              Create Goal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2 p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: savingsSummary.goal.color || '#10b981' }} /><span className="text-sm font-bold text-white truncate flex-1">{savingsSummary.goal.title}</span></div>
              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden mb-2"><div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${savingsSummary.goal.color || '#10b981'}, #06b6d4)`, width: `${savingsSummary.pct}%`, transition: 'width 0.8s ease' }} /></div>
              <div className="flex justify-between text-xs"><span className="text-slate-400">{formatCurrency(savingsSummary.goal.current_amount)} saved</span><span className="text-white font-bold">{savingsSummary.pct}%</span></div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center flex flex-col justify-center"><div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Remaining</div><div className="text-lg font-black text-amber-400" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(savingsSummary.remaining)}</div><div className="text-[10px] text-slate-500 mt-0.5">of {formatCurrency(savingsSummary.goal.target_amount)}</div></div>
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center flex flex-col justify-center"><div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">{savingsSummary.goal.deadline ? 'Deadline' : 'Total Saved'}</div><div className="text-lg font-black text-green-400" style={{ fontFamily: 'Space Grotesk' }}>{savingsSummary.goal.deadline ? format(parseISO(savingsSummary.goal.deadline), 'MMM d') : formatCurrency(savingsSummary.totalSaved)}</div><div className="text-[10px] text-slate-500 mt-0.5">{savingsSummary.goal.deadline ? format(parseISO(savingsSummary.goal.deadline), 'yyyy') : `across ${savingsSummary.count} goals`}</div></div>
          </div>
        )}
      </DashboardWidget>
    </>
  );
};

// ----------------------------------------------------
// REGISTRY
// ----------------------------------------------------

export const WIDGET_REGISTRY: WidgetConfig[] = [
  { id: 'hero', title: 'Welcome', description: 'Greeting and level info', icon: Sparkles, component: HeroWidget, defaultSize: { w: 12, h: 1, colSpan: 12 }, defaultOrder: 0, category: 'Overview', defaultVisible: true, minimumSize: { w: 12, h: 1 }, maximumSize: { w: 12, h: 2 } },
  { id: 'kpiMetrics', title: 'Key Metrics', description: 'Level, Streak, Scores', icon: Award, component: KpiMetricsWidget, defaultSize: { w: 12, h: 1, colSpan: 12 }, defaultOrder: 1, category: 'Overview', defaultVisible: true, minimumSize: { w: 12, h: 1 }, maximumSize: { w: 12, h: 2 } },
  { id: 'snapshot', title: "Today's Snapshot", description: 'Focus, Tasks, Expenses, Budget', icon: Timer, component: SnapshotWidget, defaultSize: { w: 12, h: 1, colSpan: 12 }, defaultOrder: 2, category: 'Overview', defaultVisible: true, minimumSize: { w: 12, h: 1 }, maximumSize: { w: 12, h: 2 } },
  { id: 'quickActions', title: 'Quick Actions', description: 'Command center shortcuts', icon: Zap, component: QuickActionsWidget, defaultSize: { w: 12, h: 1, colSpan: 12 }, defaultOrder: 3, category: 'Overview', defaultVisible: true, minimumSize: { w: 6, h: 1 }, maximumSize: { w: 12, h: 2 } },
  { id: 'todaysTasks', title: "Today's Tasks", description: 'Task list for today', icon: CheckSquare, component: TodaysTasksWidget, defaultSize: { w: 8, h: 2, colSpan: 8 }, defaultOrder: 4, category: 'Productivity', defaultVisible: true, minimumSize: { w: 4, h: 1 }, maximumSize: { w: 12, h: 4 } },
  { id: 'upcomingBills', title: 'Upcoming Bills', description: 'Recurring payment schedule', icon: Calendar, component: UpcomingBillsWidget, defaultSize: { w: 4, h: 2, colSpan: 4 }, defaultOrder: 5, category: 'Finance', defaultVisible: true, minimumSize: { w: 4, h: 1 }, maximumSize: { w: 6, h: 4 } },
  { id: 'focusTrend', title: 'Focus Trend', description: '7-day focus chart', icon: BarChart3, component: FocusTrendWidget, defaultSize: { w: 6, h: 2, colSpan: 6 }, defaultOrder: 6, category: 'Analytics', defaultVisible: true, minimumSize: { w: 4, h: 2 }, maximumSize: { w: 12, h: 4 } },
  { id: 'expenseTrend', title: 'Expense Trend', description: '7-day expense chart', icon: TrendingUp, component: ExpenseTrendWidget, defaultSize: { w: 6, h: 2, colSpan: 6 }, defaultOrder: 7, category: 'Analytics', defaultVisible: true, minimumSize: { w: 4, h: 2 }, maximumSize: { w: 12, h: 4 } },
  { id: 'aiInsights', title: 'AI Insights', description: 'Smart recommendations', icon: Lightbulb, component: AiInsightsWidget, defaultSize: { w: 6, h: 2, colSpan: 6 }, defaultOrder: 8, category: 'Insights', defaultVisible: true, minimumSize: { w: 4, h: 2 }, maximumSize: { w: 12, h: 4 } },
  { id: 'recentActivity', title: 'Recent Activity', description: 'Event timeline', icon: Activity, component: RecentActivityWidget, defaultSize: { w: 6, h: 2, colSpan: 6 }, defaultOrder: 9, category: 'Insights', defaultVisible: true, minimumSize: { w: 4, h: 2 }, maximumSize: { w: 12, h: 4 } },
  { id: 'savings', title: 'Savings Progress', description: 'Savings goal tracker', icon: PiggyBank, component: SavingsWidget, defaultSize: { w: 12, h: 2, colSpan: 12 }, defaultOrder: 10, category: 'Finance', defaultVisible: true, minimumSize: { w: 6, h: 2 }, maximumSize: { w: 12, h: 4 } },
];
