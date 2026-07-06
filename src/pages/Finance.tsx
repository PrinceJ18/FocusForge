import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, Trash2, TrendingDown, DollarSign, PiggyBank, Tag, X, ChevronDown, BarChart2,
  Calendar as CalendarIcon, Edit2, Check, AlertTriangle, AlertCircle, RefreshCw, ShieldAlert,
  ChevronLeft, ChevronRight, Play, Eye
} from 'lucide-react';
import { useStore, type Expense, type SavingsGoal, type CustomCategory, type RecurringExpense } from '../store/useStore';
import { supabase } from '../lib/supabase';
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday,
  addDays, subDays, startOfWeek, endOfWeek, differenceInDays, isBefore, isAfter, isSameMonth,
  addMonths, subMonths, addWeeks, subWeeks
} from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { formatCurrency } from '../lib/formatCurrency';
import { logEvent } from '../lib/events';
import {
  calculateBudgetUsage,
  calculateCategoryBreakdown,
  calculateDailySpending,
  calculateSavings
} from '../lib/statistics/finance';
import { payRecurringExpense, skipRecurringExpense } from '../lib/recurringUtils';
import RecurringDetailsModal from '../components/finance/RecurringDetailsModal';

const DEFAULT_CATEGORIES = [
  { id: 'food', name: 'Food', icon: '🍔', color: '#f59e0b' },
  { id: 'transport', name: 'Transport', icon: '🚗', color: '#06b6d4' },
  { id: 'shopping', name: 'Shopping', icon: '🛍', color: '#ec4899' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎮', color: '#a855f7' },
  { id: 'health', name: 'Health', icon: '💊', color: '#10b981' },
  { id: 'education', name: 'Education', icon: '📚', color: '#3b82f6' },
  { id: 'utilities', name: 'Utilities', icon: '💡', color: '#6b7280' },
  { id: 'other', name: 'Other', icon: '📦', color: '#8b5cf6' },
];

const RANDOM_COLORS = ['#f43f5e', '#fb923c', '#facc15', '#4ade80', '#34d399', '#22d3ee', '#818cf8', '#e879f9'];

const isDateThisMonth = (dateStr: string) => {
  try {
    return isSameMonth(parseISO(dateStr), new Date());
  } catch {
    return false;
  }
};

export default function Finance() {
  const {
    expenses, savingsGoals, customCategories, profile, user,
    addExpenseLocal, removeExpenseLocal, updateProfile, setSavingsGoals, setCustomCategories,
    recurringExpenses, addRecurringExpenseLocal, updateRecurringExpenseLocal, removeRecurringExpenseLocal
  } = useStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'recurring' | 'savings' | 'categories'>('overview');
  
  // Modal states
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);
  const [newBudget, setNewBudget] = useState(String(profile.monthly_budget));
  
  // Recurring Modal states
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | null>(null);
  const [selectedRecurringDetails, setSelectedRecurringDetails] = useState<RecurringExpense | null>(null);

  // Calendar States
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  const allCategories = useMemo(() => [
    ...DEFAULT_CATEGORIES,
    ...customCategories.map((c) => ({ id: c.id, name: c.name, icon: '🏷', color: c.color })),
  ], [customCategories]);

  const stats = useMemo(() => {
    const monthExp = expenses.filter((e) => isDateThisMonth(e.expense_date));
    const { totalSpent, available, budgetPct } = calculateBudgetUsage(expenses, profile.monthly_budget);
    const categoryData = calculateCategoryBreakdown(expenses, allCategories);
    const dailyData = calculateDailySpending(expenses);

    return { totalSpent, available, budgetPct, categoryData, dailyData, monthExp };
  }, [expenses, profile.monthly_budget, allCategories]);

  const totalSavings = calculateSavings(savingsGoals);

  const handleUpdateBudget = async () => {
    const val = parseFloat(newBudget);
    if (!isNaN(val) && val > 0) {
      updateProfile({ monthly_budget: val });
      if (user) {
        await supabase.from('profiles').upsert({ id: user.id, monthly_budget: val, updated_at: new Date().toISOString() });
      }
      setShowBudgetEdit(false);
    }
  };

  // ----------------------------------------------------
  // RECURRING CALCULATIONS & STATISTICS
  // ----------------------------------------------------
  const recurringStats = useMemo(() => {
    const activeBills = recurringExpenses.filter(r => r.status === 'active');
    
    // Monthly Projected Recurring Total
    let monthlyTotal = 0;
    let annualTotal = 0;

    activeBills.forEach(bill => {
      let multiplier = 1; // monthly multiplier
      switch (bill.frequency) {
        case 'daily': multiplier = 30; break;
        case 'weekly': multiplier = 4.33; break;
        case 'bi-weekly': multiplier = 2.16; break;
        case 'monthly': multiplier = 1; break;
        case 'quarterly': multiplier = 0.33; break;
        case 'half-yearly': multiplier = 0.16; break;
        case 'yearly': multiplier = 0.083; break;
        case 'custom': multiplier = 30 / (bill.custom_interval || 30); break;
      }
      monthlyTotal += bill.amount * multiplier;
      annualTotal += bill.amount * multiplier * 12;
    });

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    
    // Upcoming & Overdue
    const overdueBills: RecurringExpense[] = [];
    const upcomingBills: RecurringExpense[] = [];

    activeBills.forEach(bill => {
      try {
        const payDate = parseISO(bill.payment_date);
        const today = parseISO(todayStr);
        if (isBefore(payDate, today)) {
          overdueBills.push(bill);
        } else {
          upcomingBills.push(bill);
        }
      } catch (err) {
        upcomingBills.push(bill);
      }
    });

    // Upcoming grouped ranges
    const upcomingToday: RecurringExpense[] = [];
    const upcomingTomorrow: RecurringExpense[] = [];
    const upcomingThisWeek: RecurringExpense[] = [];
    const upcomingNextWeek: RecurringExpense[] = [];
    const upcomingNextMonth: RecurringExpense[] = [];

    upcomingBills.forEach(bill => {
      const days = differenceInDays(parseISO(bill.payment_date), new Date());
      if (days === 0) upcomingToday.push(bill);
      else if (days === 1) upcomingTomorrow.push(bill);
      else if (days > 1 && days <= 7) upcomingThisWeek.push(bill);
      else if (days > 7 && days <= 14) upcomingNextWeek.push(bill);
      else upcomingNextMonth.push(bill);
    });

    // Detect Subscriptions
    const subKeywords = ['netflix', 'spotify', 'prime', 'disney', 'chatgpt', 'copilot', 'youtube', 'membership', 'gym', 'hulu', 'apple', 'icloud', 'adobe'];
    const subscriptions = activeBills.filter(b => 
      subKeywords.some(kw => b.name.toLowerCase().includes(kw)) || b.category.toLowerCase() === 'entertainment' || b.category.toLowerCase() === 'subscriptions'
    );

    const monthlySubTotal = subscriptions.reduce((sum, s) => {
      let mult = 1;
      if (s.frequency === 'yearly') mult = 1/12;
      else if (s.frequency === 'weekly') mult = 4.33;
      return sum + s.amount * mult;
    }, 0);

    return {
      activeCount: activeBills.length,
      monthlyTotal,
      annualTotal,
      overdue: overdueBills,
      upcomingToday,
      upcomingTomorrow,
      upcomingThisWeek,
      upcomingNextWeek,
      upcomingNextMonth,
      subscriptions,
      monthlySubTotal,
      upcomingCount: upcomingBills.length,
    };
  }, [recurringExpenses]);

  // Insight Generation (Section 10)
  const expenseInsights = useMemo(() => {
    const list: string[] = [];
    if (recurringStats.subscriptions.length > 0) {
      list.push(`You spend ${formatCurrency(recurringStats.monthlySubTotal)} every month on subscriptions.`);
    }

    const rentBill = recurringExpenses.find(r => r.name.toLowerCase().includes('rent'));
    if (rentBill && profile.monthly_budget > 0) {
      const rentPct = Math.round((rentBill.amount / profile.monthly_budget) * 100);
      list.push(`Rent represents ${rentPct}% of your monthly spending budget.`);
    }

    if (stats.totalSpent > 0 && recurringStats.monthlyTotal > 0) {
      const ratio = Math.round((recurringStats.monthlyTotal / (stats.totalSpent + recurringStats.monthlyTotal)) * 100);
      list.push(`Your recurring expenses account for ${ratio}% of your projected spending.`);
    }

    // Default insights if list is small
    if (list.length < 3) {
      list.push(`Fixed expenses are projected at ${formatCurrency(recurringStats.monthlyTotal)} per month.`);
      list.push(`Setting auto-confirm allows FocusForge to manage bills with zero manual clicks.`);
    }

    return list;
  }, [recurringStats, expenses, profile.monthly_budget, stats.totalSpent]);

  // ----------------------------------------------------
  // CALENDAR CALCULATION
  // ----------------------------------------------------
  const calendarCells = useMemo(() => {
    const start = startOfWeek(startOfMonth(calendarDate));
    const end = endOfWeek(endOfMonth(calendarDate));
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      
      // Check bills due today
      const billsDue = recurringExpenses.filter(r => r.status === 'active' && r.payment_date === dayStr);
      
      return {
        date: day,
        dayStr,
        isCurrentMonth: isSameMonth(day, calendarDate),
        bills: billsDue,
      };
    });
  }, [calendarDate, recurringExpenses]);

  const calendarWeekCells = useMemo(() => {
    const start = startOfWeek(calendarDate);
    const end = endOfWeek(calendarDate);
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const billsDue = recurringExpenses.filter(r => r.status === 'active' && r.payment_date === dayStr);
      return {
        date: day,
        dayStr,
        bills: billsDue,
      };
    });
  }, [calendarDate, recurringExpenses]);

  return (
    <div className="page-enter space-y-6 px-1 sm:px-0">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <FinStatCard
          label="Monthly Budget"
          value={`${formatCurrency(profile.monthly_budget)}`}
          color="#a855f7"
          icon={<DollarSign size={18} />}
          action={
            <button
              onClick={() => setShowBudgetEdit(true)}
              className="text-xs mt-1"
              style={{ color: 'var(--purple-primary)' }}
            >
              Edit
            </button>
          }
        />
        <FinStatCard
          label="Spent"
          value={`${formatCurrency(stats.totalSpent)}`}
          sub={`${stats.budgetPct.toFixed(0)}%`}
          color={stats.budgetPct > 80 ? '#ef4444' : '#f59e0b'}
          icon={<TrendingDown size={18} />}
        />
        <FinStatCard
          label="Available"
          value={`${formatCurrency(Math.max(0, stats.available))}`}
          color="#10b981"
          icon={<DollarSign size={18} />}
        />
        <FinStatCard
          label="Savings"
          value={`${formatCurrency(totalSavings)}`}
          color="#06b6d4"
          icon={<PiggyBank size={18} />}
        />
      </div>

      {/* Budget progress */}
      <div className="glass-card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Budget Usage — {format(new Date(), 'MMMM yyyy')}
          </p>
          <span
            className="text-sm font-bold"
            style={{ color: stats.budgetPct > 80 ? '#ef4444' : 'var(--text-primary)' }}
          >
            {stats.budgetPct.toFixed(1)}%
          </span>
        </div>
        <div className="progress-bar" style={{ height: 10 }}>
          <div
            className="progress-fill"
            style={{
              width: `${stats.budgetPct}%`,
              background:
                stats.budgetPct > 80
                  ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                  : 'linear-gradient(90deg, #a855f7, #ec4899)',
              boxShadow: stats.budgetPct > 80 ? '0 0 12px rgba(239,68,68,0.4)' : 'var(--glow-purple)',
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>{formatCurrency(0)}</span>
          <span>{formatCurrency(profile.monthly_budget / 2)}</span>
          <span>{formatCurrency(profile.monthly_budget)}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto scrollbar-hide">
        <TabNav
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'expenses', label: `Expenses (${stats.monthExp.length})` },
            { id: 'recurring', label: 'Recurring & Bills' },
            { id: 'savings', label: 'Savings' },
            { id: 'categories', label: 'Categories' },
          ]}
          active={activeTab}
          onChange={(t) => setActiveTab(t as typeof activeTab)}
        />
      </div>

      {/* Overview tab */}
      {
        activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Category donut */}
            <div className="glass-card p-5">
              <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Spending by Category</h3>
              {stats.categoryData.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                  <div style={{ width: window.innerWidth < 640 ? 180 : 140, height: window.innerWidth < 640 ? 180 : 140, }} >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stats.categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                          {stats.categoryData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: 'rgba(10,10,20,0.95)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 10, fontSize: 12, color: 'white' }}
                          formatter={(val: any) => [`${formatCurrency(val)}`, '']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2">
                    {stats.categoryData.map((cat) => (
                      <div key={cat.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: cat.fill }} />
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{cat.name}</span>
                        </div>
                        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(cat.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState icon={<TrendingDown size={32} />} text="No expenses this month" />
              )}
            </div>

            {/* Daily spending chart */}
            <div className="glass-card p-5">
              <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Daily Spending</h3>
              {stats.dailyData.some((d) => d.amount > 0) ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={stats.dailyData} barSize={12}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'rgba(10,10,20,0.95)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 10, fontSize: 12, color: 'white' }}
                      formatter={(val: any) => [`${formatCurrency(val)}`, 'Spent']}
                    />
                    <Bar dataKey="amount" fill="url(#barGrad)" radius={[4, 4, 0, 0]} />
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState icon={<BarChart2 size={32} />} text="No data yet" />
              )}
            </div>
          </div>
        )
      }

      {/* Expenses tab */}
      {
        activeTab === 'expenses' && (
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                All Expenses — {format(new Date(), 'MMMM')}
              </h3>
              <button
                onClick={() => setShowAddExpense(true)}
                className="btn-neon px-3 py-2 text-sm flex items-center gap-1.5"
                style={{ borderRadius: 10 }}
              >
                <Plus size={14} /> Add Expense
              </button>
            </div>

            {stats.monthExp.length > 0 ? (
              <div className="space-y-2">
                {stats.monthExp.map((exp) => (
                  <ExpenseItem
                    key={exp.id}
                    expense={exp}
                    categories={allCategories}
                    onDelete={async () => {
                      removeExpenseLocal(exp.id);
                      if (user) await supabase.from('expenses').delete().eq('id', exp.id);
                    }}
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon={<TrendingDown size={32} />} text="No expenses this month">
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="btn-neon px-4 py-2 text-sm mt-3"
                  style={{ borderRadius: 10 }}
                >
                  Add First Expense
                </button>
              </EmptyState>
            )}
          </div>
        )
      }

      {/* RECURRING & BILLS TAB */}
      {
        activeTab === 'recurring' && (
          <div className="space-y-6">
            
            {/* SECTION 1: Summary Cards Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <FinStatCard
                label="Active Bills"
                value={String(recurringStats.activeCount)}
                color="#a855f7"
                icon={<RefreshCw size={16} />}
              />
              <FinStatCard
                label="Monthly Projected"
                value={formatCurrency(recurringStats.monthlyTotal)}
                color="#06b6d4"
                icon={<DollarSign size={16} />}
              />
              <FinStatCard
                label="Annual Projected"
                value={formatCurrency(recurringStats.annualTotal)}
                color="#10b981"
                icon={<TrendingDown size={16} />}
              />
              <FinStatCard
                label="Overdue Bills"
                value={String(recurringStats.overdue.length)}
                color={recurringStats.overdue.length > 0 ? '#ef4444' : '#6b7280'}
                icon={<ShieldAlert size={16} />}
              />
              <FinStatCard
                label="Upcoming Payments"
                value={String(recurringStats.upcomingCount)}
                color="#fbbf24"
                icon={<CalendarIcon size={16} />}
              />
              <div className="stat-card flex flex-col justify-between">
                <div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Action</span>
                </div>
                <button
                  onClick={() => setShowAddRecurring(true)}
                  className="btn-neon w-full py-1.5 text-xs font-bold"
                  style={{ borderRadius: 8 }}
                >
                  + Add Bill
                </button>
              </div>
            </div>

            {/* TWO COLUMN CONTENT LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* LEFT & CENTER COLUMN: OVERDUE, UPCOMING, CALENDAR */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* SECTION 6: Overdue/Missed Payments */}
                {recurringStats.overdue.length > 0 && (
                  <div className="glass-card p-5 border border-red-500/20" style={{ background: 'rgba(239,68,68,0.02)' }}>
                    <h3 className="font-bold text-sm text-red-400 mb-3 flex items-center gap-2">
                      <ShieldAlert size={16} />
                      Overdue / Missed Payments ({recurringStats.overdue.length})
                    </h3>
                    <div className="space-y-3">
                      {recurringStats.overdue.map(bill => (
                        <div 
                          key={bill.id} 
                          className="p-4 rounded-xl bg-red-950/20 border border-red-900/30 flex items-center justify-between gap-4 cursor-pointer hover:border-red-500/30 transition-all text-left"
                          onClick={() => setSelectedRecurringDetails(bill)}
                        >
                          <div>
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                              <span className="text-lg">{bill.icon}</span>
                              {bill.name}
                            </h4>
                            <p className="text-xs text-red-300 mt-1">
                              Due Date: {bill.payment_date} ({differenceInDays(new Date(), parseISO(bill.payment_date))} Days Overdue)
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-extrabold text-red-400">-{formatCurrency(bill.amount)}</span>
                            <span className="text-[10px] text-red-400 font-bold uppercase border border-red-500/20 px-2 py-0.5 rounded">Overdue</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SECTION 7: Calendar View */}
                <div className="glass-card p-5">
                  <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <CalendarIcon size={16} className="text-purple-400" />
                      Bills Calendar View
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="flex bg-slate-900 rounded-lg p-0.5 border border-white/5">
                        <button
                          onClick={() => setCalendarView('month')}
                          className={`px-2.5 py-1 text-xs rounded-md ${calendarView === 'month' ? 'bg-purple-500/20 text-white font-bold' : 'text-slate-400'}`}
                        >
                          Month
                        </button>
                        <button
                          onClick={() => setCalendarView('week')}
                          className={`px-2.5 py-1 text-xs rounded-md ${calendarView === 'week' ? 'bg-purple-500/20 text-white font-bold' : 'text-slate-400'}`}
                        >
                          Week
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-1.5 ml-2">
                        <button
                          onClick={() => setCalendarDate(prev => calendarView === 'month' ? subMonths(prev, 1) : subWeeks(prev, 1))}
                          className="p-1 rounded bg-slate-950 border border-white/5 text-slate-400 hover:text-white"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-xs font-semibold text-slate-200">
                          {format(calendarDate, calendarView === 'month' ? 'MMMM yyyy' : 'MMM d, yyyy')}
                        </span>
                        <button
                          onClick={() => setCalendarDate(prev => calendarView === 'month' ? addMonths(prev, 1) : addWeeks(prev, 1))}
                          className="p-1 rounded bg-slate-950 border border-white/5 text-slate-400 hover:text-white"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Calendar Grid rendering */}
                  {calendarView === 'month' ? (
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                        <div key={idx} className="text-[10px] font-bold text-slate-500 py-1">{day}</div>
                      ))}
                      {calendarCells.map((cell, idx) => (
                        <div
                          key={idx}
                          className={`min-h-[60px] p-1 border rounded-lg flex flex-col justify-between transition-all ${
                            cell.isCurrentMonth ? 'bg-slate-950/20 border-white/5' : 'bg-slate-900/10 border-white/3 opacity-30'
                          } ${isToday(cell.date) ? 'border-purple-500/50 bg-purple-500/5' : ''}`}
                        >
                          <span className={`text-[10px] font-bold self-end ${isToday(cell.date) ? 'text-purple-400' : 'text-slate-400'}`}>
                            {format(cell.date, 'd')}
                          </span>
                          
                          <div className="flex flex-wrap gap-0.5 justify-center mt-1">
                            {cell.bills.map(b => (
                              <button
                                key={b.id}
                                type="button"
                                className="text-[11px] w-5 h-5 rounded-full flex items-center justify-center bg-purple-500/20 border border-purple-500/50 hover:bg-purple-500/40 hover:scale-110 transition-all cursor-pointer"
                                title={`${b.name}: -${formatCurrency(b.amount)}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRecurringDetails(b);
                                }}
                              >
                                {b.icon}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-7 gap-2">
                      {calendarWeekCells.map((cell, idx) => (
                        <div
                          key={idx}
                          className={`min-h-[100px] p-2 border rounded-xl flex flex-col justify-between ${
                            isToday(cell.date) ? 'border-purple-500 bg-purple-500/5' : 'border-white/5 bg-slate-950/30'
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] text-slate-500 uppercase">{format(cell.date, 'EEE')}</span>
                            <span className="text-xs font-black text-slate-200 mt-0.5">{format(cell.date, 'd')}</span>
                          </div>
                          
                          <div className="space-y-1 mt-2">
                            {cell.bills.map(b => (
                              <div
                                key={b.id}
                                className="px-1.5 py-0.5 rounded text-[8px] font-semibold flex items-center gap-1 border cursor-pointer hover:-translate-y-0.5 transition-all"
                                style={{ background: `${b.color || '#a855f7'}15`, color: b.color || '#a855f7', borderColor: `${b.color || '#a855f7'}30` }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRecurringDetails(b);
                                }}
                              >
                                <span>{b.icon}</span>
                                <span className="truncate max-w-[40px]">{b.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SECTION 3: Upcoming Payments List */}
                <div className="glass-card p-5">
                  <h3 className="font-semibold text-sm mb-4">Upcoming Billing Cycles</h3>
                  <div className="space-y-5">
                    {/* Today */}
                    {recurringStats.upcomingToday.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2">Today</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {recurringStats.upcomingToday.map(bill => (
                            <UpcomingBillCard key={bill.id} bill={bill} onSelect={() => setSelectedRecurringDetails(bill)} />
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Tomorrow */}
                    {recurringStats.upcomingTomorrow.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-pink-400 uppercase tracking-widest mb-2">Tomorrow</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {recurringStats.upcomingTomorrow.map(bill => (
                            <UpcomingBillCard key={bill.id} bill={bill} onSelect={() => setSelectedRecurringDetails(bill)} />
                          ))}
                        </div>
                      </div>
                    )}
                    {/* This Week */}
                    {recurringStats.upcomingThisWeek.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2">This Week</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {recurringStats.upcomingThisWeek.map(bill => (
                            <UpcomingBillCard key={bill.id} bill={bill} onSelect={() => setSelectedRecurringDetails(bill)} />
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Next Month */}
                    {recurringStats.upcomingNextMonth.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-medium">Later Next Month</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {recurringStats.upcomingNextMonth.map(bill => (
                            <UpcomingBillCard key={bill.id} bill={bill} onSelect={() => setSelectedRecurringDetails(bill)} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION 4: All Configured Bills & Subscriptions */}
                <div className="glass-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm">All Configured Bills ({recurringExpenses.length})</h3>
                    <button
                      onClick={() => setShowAddRecurring(true)}
                      className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 rounded-lg text-[10px] font-bold"
                    >
                      + Add Bill
                    </button>
                  </div>

                  <div className="space-y-2">
                    {recurringExpenses.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4">No bills configured yet.</p>
                    ) : (
                      recurringExpenses.map(bill => {
                        return (
                          <div
                            key={bill.id}
                            className="p-3 rounded-xl bg-white/2 border border-white/5 flex items-center justify-between hover:border-purple-500/20 transition-all cursor-pointer text-left"
                            onClick={() => setSelectedRecurringDetails(bill)}
                          >
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                                style={{ background: `${bill.color}15`, color: bill.color }}
                              >
                                {bill.icon || '🏷'}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-white">{bill.name}</h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[9px] text-slate-400 capitalize">{bill.frequency}</span>
                                  <span className="text-[9px] text-slate-500">•</span>
                                  <span 
                                    className="text-[9px] font-semibold uppercase"
                                    style={{ color: bill.status === 'active' ? '#10b981' : '#f59e0b' }}
                                  >
                                    {bill.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-extrabold text-white">-{formatCurrency(bill.amount)}</span>
                              <span className="text-[9px] text-slate-500 block mt-0.5">Due {bill.payment_date}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: FINANCIAL PLANNING & SUBSCRIPTIONS */}
              <div className="space-y-6">
                
                {/* SECTION 8: Financial Planning */}
                <div className="glass-card p-5">
                  <h3 className="font-semibold text-sm mb-4">Financial Planning Projections</h3>
                  <div className="space-y-4">
                    <div className="p-3 bg-white/2 rounded-xl border border-white/5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Monthly Projected Spending</span>
                        <span className="font-bold text-white">{formatCurrency(recurringStats.monthlyTotal)}</span>
                      </div>
                      <div className="w-full bg-slate-900 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-purple-500 h-full" style={{ width: `${Math.min(100, (recurringStats.monthlyTotal / Math.max(1, profile.monthly_budget)) * 100)}%` }} />
                      </div>
                    </div>

                    <div className="p-3 bg-white/2 rounded-xl border border-white/5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Annual Projected Spending</span>
                        <span className="font-bold text-white">{formatCurrency(recurringStats.annualTotal)}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-white/2 rounded-xl border border-white/5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Savings Post Recurring Bills</span>
                        <span className="font-bold text-green-400">
                          {formatCurrency(Math.max(0, profile.monthly_budget - recurringStats.monthlyTotal))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 9: Subscriptions Detectors */}
                <div className="glass-card p-5">
                  <h3 className="font-semibold text-sm mb-3">Detected Subscriptions</h3>
                  {recurringStats.subscriptions.length === 0 ? (
                    <p className="text-xs text-slate-500">No subscription-type items detected.</p>
                  ) : (
                    <div className="space-y-3">
                      {recurringStats.subscriptions.map(bill => (
                        <div key={bill.id} className="p-3 bg-slate-950/40 rounded-xl border border-white/5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">{bill.icon}</span>
                            <div>
                              <h4 className="text-xs font-bold text-white">{bill.name}</h4>
                              <p className="text-[10px] text-slate-500">Next payment: {bill.payment_date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-extrabold text-white">{formatCurrency(bill.amount)}</div>
                            <span className="text-[9px] uppercase font-bold text-purple-400 tracking-wider">{bill.frequency}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SECTION 10: Expense Insights */}
                <div className="glass-card p-5">
                  <h3 className="font-semibold text-sm mb-3">Bill Insights</h3>
                  <div className="space-y-3">
                    {expenseInsights.map((insight, idx) => (
                      <div key={idx} className="p-3 bg-white/2 rounded-xl border border-white/5 flex items-start gap-2.5 text-xs text-slate-300">
                        <div className="text-lg">💡</div>
                        <p>{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>

          </div>
        )
      }

      {/* Savings tab */}
      {
        activeTab === 'savings' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Savings Goals</h3>
              <button
                onClick={() => setShowAddGoal(true)}
                className="btn-neon px-3 py-2 text-sm flex items-center gap-1.5"
                style={{ borderRadius: 10 }}
              >
                <Plus size={14} /> New Goal
              </button>
            </div>

            {savingsGoals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savingsGoals.map((goal) => (
                  <SavingsGoalCard
                    key={goal.id}
                    goal={goal}
                    onDelete={async () => {
                      const updated = savingsGoals.filter((g) => g.id !== goal.id);
                      setSavingsGoals(updated);
                      if (user) await supabase.from('savings_goals').delete().eq('id', goal.id);
                    }}
                    onAddFunds={async (amt) => {
                      const updated = savingsGoals.map((g) => {
                        if (g.id === goal.id) {
                          const newAmt = (g.current_amount || 0) + amt;
                          return { ...g, current_amount: newAmt };
                        }
                        return g;
                      });
                      setSavingsGoals(updated);
                      if (user) {
                        const targetGoal = updated.find((g) => g.id === goal.id);
                        await supabase.from('savings_goals').update({ current_amount: targetGoal?.current_amount }).eq('id', goal.id);
                      }
                    }}
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon={<PiggyBank size={32} />} text="No savings goals created yet">
                <button
                  onClick={() => setShowAddGoal(true)}
                  className="btn-neon px-4 py-2 text-sm mt-3"
                  style={{ borderRadius: 10 }}
                >
                  Create Savings Goal
                </button>
              </EmptyState>
            )}
          </div>
        )
      }

      {/* Categories tab */}
      {
        activeTab === 'categories' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Custom Categories</h3>
              <button
                onClick={() => setShowAddCategory(true)}
                className="btn-neon px-3 py-2 text-sm flex items-center gap-1.5"
                style={{ borderRadius: 10 }}
              >
                <Plus size={14} /> New Category
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {allCategories.map((c) => {
                const isCustom = customCategories.some((cc) => cc.id === c.id);
                return (
                  <div
                    key={c.id}
                    className="p-4 rounded-16 flex items-center justify-between"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 16,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                        style={{ background: `${c.color}20`, color: c.color }}
                      >
                        {c.icon}
                      </div>
                      <span className="text-xs font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
                    </div>

                    {isCustom && (
                      <button
                        onClick={async () => {
                          const updated = customCategories.filter((cc) => cc.id !== c.id);
                          setCustomCategories(updated);
                          if (user) await supabase.from('custom_categories').delete().eq('id', c.id);
                        }}
                        className="p-1 rounded hover:bg-red-500/10 text-red-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )
      }

      {/* MODALS */}
      {showAddExpense && (
        <AddExpenseModal
          categories={allCategories}
          onClose={() => setShowAddExpense(false)}
          onAdd={async (data: any) => {
            const newExp = {
              id: crypto.randomUUID(),
              user_id: user?.id || 'local',
              ...data,
              created_at: new Date().toISOString(),
            };
            addExpenseLocal(newExp);
            logEvent('expense_added', 'finance', newExp.id, {
              title: data.title,
              amount: data.amount,
              description: `Logged expense: ${data.title} (-${formatCurrency(data.amount)})`,
            });
            if (user) {
              const { data: inserted } = await supabase.from('expenses').insert({
                user_id: user.id,
                title: data.title,
                amount: data.amount,
                category: data.category,
                note: data.note,
                expense_date: data.expense_date,
              }).select().single();
              if (inserted) {
                removeExpenseLocal(newExp.id);
                addExpenseLocal(inserted);
              }
            }
            setShowAddExpense(false);
          }}
        />
      )}

      {showAddGoal && (
        <AddGoalModal
          onClose={() => setShowAddGoal(false)}
          onAdd={async (data) => {
            const newGoal = { id: crypto.randomUUID(), ...data };
            setSavingsGoals([...savingsGoals, newGoal]);
            if (user) {
              const { data: inserted } = await supabase.from('savings_goals').insert({
                user_id: user.id,
                ...data,
              }).select().single();
              if (inserted) {
                setSavingsGoals([...savingsGoals.filter((g) => g.id !== newGoal.id), inserted]);
              }
            }
            setShowAddGoal(false);
          }}
        />
      )}

      {showAddCategory && (
        <AddCategoryModal
          onClose={() => setShowAddCategory(false)}
          onAdd={async (data) => {
            const newCat = { id: crypto.randomUUID(), ...data };
            setCustomCategories([...customCategories, newCat]);
            if (user) {
              const { data: inserted } = await supabase.from('custom_categories').insert({
                user_id: user.id,
                ...data,
              }).select().single();
              if (inserted) {
                setCustomCategories([...customCategories.filter((c) => c.id !== newCat.id), inserted]);
              }
            }
            setShowAddCategory(false);
          }}
        />
      )}

      {showBudgetEdit && (
        <div className="modal-overlay" onClick={() => setShowBudgetEdit(false)}>
          <div className="modal-content p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>
              Edit Monthly Budget
            </h3>
            <input
              type="number"
              min="1"
              value={newBudget}
              onChange={(e) => setNewBudget(e.target.value)}
              className="input-glass w-full px-4 py-3 text-lg mb-4"
              placeholder="5000"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowBudgetEdit(false)} className="btn-ghost flex-1 px-4 py-2.5 text-sm">Cancel</button>
              <button onClick={handleUpdateBudget} className="btn-neon flex-1 px-4 py-2.5 text-sm">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE RECURRING EXPENSE MODAL */}
      {showAddRecurring && (
        <AddEditRecurringModal
          categories={allCategories}
          onClose={() => setShowAddRecurring(false)}
          onSave={async (data) => {
            const newBill: RecurringExpense = {
              id: crypto.randomUUID(),
              user_id: user?.id || 'local',
              status: 'active',
              last_payment_date: null,
              created_at: new Date().toISOString(),
              ...data,
            };
            addRecurringExpenseLocal(newBill);
            
            // Log Event
            logEvent('recurring_created', 'finance', newBill.id, {
              title: data.name,
              description: `Created recurring subscription/bill: ${data.name} (-₹${data.amount})`,
            });

            if (user) {
              await supabase.from('recurring_expenses').insert({
                id: newBill.id,
                user_id: user.id,
                name: data.name,
                amount: data.amount,
                category: data.category,
                description: data.description,
                start_date: data.start_date,
                end_date: data.end_date,
                frequency: data.frequency,
                custom_interval: data.custom_interval,
                payment_date: data.payment_date,
                reminder: data.reminder,
                reminder_custom_days: data.reminder_custom_days,
                notification: data.notification,
                icon: data.icon,
                color: data.color,
                auto_confirm: data.auto_confirm,
                auto_add: data.auto_add,
                status: data.status,
              });
            }
            setShowAddRecurring(false);
          }}
        />
      )}

      {/* EDIT RECURRING EXPENSE MODAL */}
      {editingRecurring && (
        <AddEditRecurringModal
          categories={allCategories}
          initialData={editingRecurring}
          onClose={() => setEditingRecurring(null)}
          onSave={async (data) => {
            updateRecurringExpenseLocal(editingRecurring.id, data);
            
            // Log Event
            logEvent('recurring_updated', 'finance', editingRecurring.id, {
              title: data.name,
              description: `Updated recurring subscription/bill: ${data.name}`,
            });

            if (user) {
              await supabase.from('recurring_expenses').update({
                name: data.name,
                amount: data.amount,
                category: data.category,
                description: data.description,
                start_date: data.start_date,
                end_date: data.end_date,
                frequency: data.frequency,
                custom_interval: data.custom_interval,
                payment_date: data.payment_date,
                reminder: data.reminder,
                reminder_custom_days: data.reminder_custom_days,
                notification: data.notification,
                icon: data.icon,
                color: data.color,
                auto_confirm: data.auto_confirm,
                auto_add: data.auto_add,
                status: data.status,
              }).eq('id', editingRecurring.id);
            }
            setEditingRecurring(null);
          }}
          onDelete={async () => {
            removeRecurringExpenseLocal(editingRecurring.id);
            
            // Log Event
            logEvent('recurring_deleted', 'finance', editingRecurring.id, {
              title: editingRecurring.name,
              description: `Deleted recurring subscription/bill: ${editingRecurring.name}`,
            });

            if (user) {
              await supabase.from('recurring_expenses').delete().eq('id', editingRecurring.id);
            }
            setEditingRecurring(null);
          }}
        />
      )}

      {selectedRecurringDetails && (
        <RecurringDetailsModal
          bill={selectedRecurringDetails}
          onClose={() => setSelectedRecurringDetails(null)}
          onEdit={() => {
            const billToEdit = selectedRecurringDetails;
            setSelectedRecurringDetails(null);
            setEditingRecurring(billToEdit);
          }}
          onDelete={async () => {
            removeRecurringExpenseLocal(selectedRecurringDetails.id);
            logEvent('recurring_deleted', 'finance', selectedRecurringDetails.id, {
              title: selectedRecurringDetails.name,
              description: `Deleted recurring subscription/bill: ${selectedRecurringDetails.name}`,
            });
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

// ----------------------------------------------------
// SUB COMPONENTS
// ----------------------------------------------------

function FinStatCard({ label, value, sub, color, icon, action }: {
  label: string; value: string; sub?: string; color: string; icon: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20`, color }}>
          {icon}
        </div>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <div className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>{value}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
      {action}
    </div>
  );
}

function ExpenseItem({ expense, categories, onDelete }: {
  expense: any; categories: any[]; onDelete: () => void;
}) {
  const cat = categories.find((c) => c.id === expense.category);
  return (
    <div className="expense-item">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-sm"
          style={{ background: `${cat?.color || '#8b5cf6'}20` }}
        >
          {cat?.icon || '📦'}
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{expense.title}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{expense.expense_date} • {cat?.name || expense.category}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold" style={{ color: '#ef4444' }}>-{formatCurrency(expense.amount)}</span>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg transition-all"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.15)';
            (e.currentTarget as HTMLElement).style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function SavingsGoalCard({ goal, onDelete, onAddFunds }: {
  goal: any; onDelete: () => void; onAddFunds: (amount: number) => void;
}) {
  const [addAmount, setAddAmount] = useState('');
  const pct = Math.min((goal.current_amount / goal.target_amount) * 100, 100);

  return (
    <div className="glass-card p-5" style={{ borderColor: `${goal.color}30` }}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{goal.title}</h4>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold" style={{ color: goal.color }}>
            {pct.toFixed(0)}%
          </span>
          <button onClick={onDelete} className="text-slate-500 hover:text-red-400">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="progress-bar mb-3" style={{ height: 6 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: goal.color, boxShadow: `0 0 8px ${goal.color}` }} />
      </div>

      <div className="flex justify-between text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        <span>Saved: {formatCurrency(goal.current_amount)}</span>
        <span>Goal: {formatCurrency(goal.target_amount)}</span>
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          min="1"
          placeholder="Amount"
          value={addAmount}
          onChange={(e) => setAddAmount(e.target.value)}
          className="input-glass px-3 py-1.5 text-xs flex-1"
        />
        <button
          onClick={() => {
            const val = parseFloat(addAmount);
            if (!isNaN(val) && val > 0) {
              onAddFunds(val);
              setAddAmount('');
            }
          }}
          className="btn-neon px-3 py-1.5 text-xs"
          style={{ borderRadius: 8 }}
        >
          Add Funds
        </button>
      </div>
    </div>
  );
}

function UpcomingBillCard({ bill, onSelect }: { bill: RecurringExpense; onSelect: () => void }) {
  const daysLeft = differenceInDays(parseISO(bill.payment_date), new Date());
  return (
    <div
      className="p-4 rounded-xl bg-white/2 border border-white/5 flex items-center justify-between hover:border-purple-500/20 transition-all cursor-pointer text-left"
      onClick={onSelect}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-xl">
          {bill.icon}
        </div>
        <div>
          <h4 className="text-xs font-black text-white">{bill.name}</h4>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5 block">{bill.category}</span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs font-extrabold text-white">{formatCurrency(bill.amount)}</div>
        <p className="text-[10px] text-purple-400 font-medium mt-0.5">
          {daysLeft === 0 ? 'Due Today' : daysLeft === 1 ? 'Due Tomorrow' : `In ${daysLeft} days`}
        </p>
      </div>
    </div>
  );
}

function AddExpenseModal({ categories, onClose, onAdd }: {
  categories: any[];
  onClose: () => void;
  onAdd: (data: any) => void;
}) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>Add Expense</h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-glass w-full px-4 py-2.5"
              placeholder="Coffee, Groceries..."
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>Amount</label>
              <input
                type="number"
                min = "1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-glass w-full px-4 py-2.5"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-glass w-full px-4 py-2.5"
              />
            </div>
          </div>
          <div>
            <label className="font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-glass w-full px-4 py-2.5"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input-glass w-full px-4 py-2.5"
              placeholder="Optional note..."
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn-ghost flex-1 px-4 py-2 text-sm font-semibold">Cancel</button>
          <button
            onClick={() => {
              if (title && amount) {
                onAdd({ title, amount: parseFloat(amount), category, note, expense_date: date });
              }
            }}
            className="btn-neon flex-1 px-4 py-2 text-sm font-semibold"
          >
            Add Expense
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// ADD / EDIT RECURRING MODAL COMPONENT
// ----------------------------------------------------

function AddEditRecurringModal({
  categories,
  initialData,
  onClose,
  onSave,
  onDelete
}: {
  categories: any[];
  initialData?: RecurringExpense;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [amount, setAmount] = useState(initialData ? String(initialData.amount) : '');
  const [category, setCategory] = useState(initialData?.category || 'food');
  const [description, setDescription] = useState(initialData?.description || '');
  const [startDate, setStartDate] = useState(initialData?.start_date || format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(initialData?.end_date || '');
  const [frequency, setFrequency] = useState(initialData?.frequency || 'monthly');
  const [customInterval, setCustomInterval] = useState(initialData ? String(initialData.custom_interval) : '30');
  const [paymentDate, setPaymentDate] = useState(initialData?.payment_date || format(new Date(), 'yyyy-MM-dd'));
  const [reminder, setReminder] = useState(initialData?.reminder || 'same-day');
  const [reminderCustomDays, setReminderCustomDays] = useState(initialData ? String(initialData.reminder_custom_days) : '0');
  const [notification, setNotification] = useState(initialData ? initialData.notification : true);
  const [icon, setIcon] = useState(initialData?.icon || '🏷');
  const [color, setColor] = useState(initialData?.color || '#a855f7');
  const [autoConfirm, setAutoConfirm] = useState(initialData ? initialData.auto_confirm : false);
  const [autoAdd, setAutoAdd] = useState(initialData ? initialData.auto_add : false);
  const [status, setStatus] = useState(initialData?.status || 'active');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleValidateAndSave = () => {
    setValidationError(null);
    if (!name.trim()) {
      setValidationError('Expense name is required.');
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setValidationError('Amount must be greater than 0.');
      return;
    }
    if (!startDate) {
      setValidationError('Start date is required.');
      return;
    }
    if (!paymentDate) {
      setValidationError('First billing/payment date is required.');
      return;
    }
    if (endDate && isBefore(parseISO(endDate), parseISO(startDate))) {
      setValidationError('End date cannot be before the start date.');
      return;
    }
    if (frequency === 'custom') {
      const customInt = parseInt(customInterval);
      if (isNaN(customInt) || customInt <= 0) {
        setValidationError('Custom interval must be a positive number of days.');
        return;
      }
    }
    if (reminder === 'custom') {
      const customRem = parseInt(reminderCustomDays);
      if (isNaN(customRem) || customRem < 0) {
        setValidationError('Custom reminder days must be a non-negative number.');
        return;
      }
    }

    onSave({
      name: name.trim(),
      amount: amt,
      category,
      description: description.trim(),
      start_date: startDate,
      end_date: endDate || null,
      frequency,
      custom_interval: frequency === 'custom' ? parseInt(customInterval) : 30,
      payment_date: paymentDate,
      reminder,
      reminder_custom_days: reminder === 'custom' ? parseInt(reminderCustomDays) : 0,
      notification,
      icon: icon.trim() || '🏷',
      color,
      auto_confirm: autoConfirm,
      auto_add: autoAdd,
      status,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>
            {initialData ? 'Edit Recurring Expense' : 'Create Recurring Expense'}
          </h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="font-medium text-slate-400 mb-1 block">Expense Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-glass w-full px-4 py-2.5" placeholder="Netflix, Gym membership, Rent..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-slate-400 mb-1 block">Amount</label>
              <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-glass w-full px-4 py-2.5" placeholder="0.00" />
            </div>
            <div>
              <label className="font-medium text-slate-400 mb-1 block">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-glass w-full px-4 py-2.5">
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="font-medium text-slate-400 mb-1 block">Description (Optional)</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="input-glass w-full px-4 py-2.5" placeholder="Additional details..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-slate-400 mb-1 block">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-glass w-full px-4 py-2.5" />
            </div>
            <div>
              <label className="font-medium text-slate-400 mb-1 block">First Billing Date</label>
              <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="input-glass w-full px-4 py-2.5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-slate-400 mb-1 block">Frequency</label>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="input-glass w-full px-4 py-2.5">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="bi-weekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="half-yearly">Half-yearly</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom (Days)</option>
              </select>
            </div>
            {frequency === 'custom' && (
              <div>
                <label className="font-medium text-slate-400 mb-1 block">Custom Interval (Days)</label>
                <input type="number" min="1" value={customInterval} onChange={(e) => setCustomInterval(e.target.value)} className="input-glass w-full px-4 py-2.5" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-slate-400 mb-1 block">Recurrence Status</label>
              <select 
                value={status} 
                onChange={(e) => setStatus(e.target.value)} 
                className="input-glass w-full px-4 py-2.5"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="font-medium text-slate-400 mb-1 block">End Date (Optional)</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="input-glass w-full px-4 py-2.5" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-slate-400 mb-1 block">Reminder Preferences</label>
              <select value={reminder} onChange={(e) => setReminder(e.target.value)} className="input-glass w-full px-4 py-2.5">
                <option value="same-day">Same Day</option>
                <option value="1-day">1 Day Before</option>
                <option value="2-days">2 Days Before</option>
                <option value="3-days">3 Days Before</option>
                <option value="7-days">7 Days Before</option>
                <option value="custom">Custom (Days)</option>
              </select>
            </div>
            {reminder === 'custom' && (
              <div>
                <label className="font-medium text-slate-400 mb-1 block">Custom Reminder (Days)</label>
                <input type="number" min="0" value={reminderCustomDays} onChange={(e) => setReminderCustomDays(e.target.value)} className="input-glass w-full px-4 py-2.5" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex items-center justify-between p-2 bg-white/2 rounded-lg border border-white/5">
              <span>Auto Confirm</span>
              <input type="checkbox" checked={autoConfirm} onChange={(e) => setAutoConfirm(e.target.checked)} className="w-4 h-4 accent-purple-500" />
            </div>
            <div className="flex items-center justify-between p-2 bg-white/2 rounded-lg border border-white/5">
              <span>Auto Add Expense</span>
              <input type="checkbox" checked={autoAdd} onChange={(e) => setAutoAdd(e.target.checked)} className="w-4 h-4 accent-purple-500" />
            </div>
          </div>
          <div className="text-[10px] text-slate-500 italic mt-0.5 text-right">
            * Auto options process in-app when you open the application.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-slate-400 mb-1 block">Visual Icon</label>
              <input type="text" value={icon} onChange={(e) => setIcon(e.target.value)} className="input-glass w-full px-4 py-2.5 text-center" />
            </div>
            <div>
              <label className="font-medium text-slate-400 mb-1 block">Accent Color</label>
              <div className="flex gap-2 flex-wrap mt-1">
                {RANDOM_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-5 h-5 rounded-full border border-white/10"
                    style={{ background: c, transform: color === c ? 'scale(1.2)' : 'none' }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {validationError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[11px] flex items-center gap-1.5 font-semibold mt-4">
            <AlertCircle size={14} className="shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          {initialData && onDelete && (
            <button 
              type="button"
              onClick={onDelete} 
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold"
            >
              Delete
            </button>
          )}
          <button 
            type="button"
            onClick={onClose} 
            className="btn-ghost flex-1 px-4 py-2 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleValidateAndSave}
            className="btn-neon flex-1 px-4 py-2 text-xs font-semibold"
          >
            {initialData ? 'Save Changes' : 'Create Bill'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddGoalModal({ onClose, onAdd }: { onClose: () => void; onAdd: (data: any) => void }) {
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [color, setColor] = useState('#06b6d4');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>New Savings Goal</h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input-glass w-full px-4 py-3 text-sm" placeholder="Goal title (e.g. MacBook Pro)" />
          <input type="number" min="1" value={target} onChange={(e) => setTarget(e.target.value)} className="input-glass w-full px-4 py-3 text-sm" placeholder={`Target amount (${formatCurrency(0)})`} />
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="input-glass w-full px-4 py-3 text-sm" />
          <div className="flex gap-2.5 flex-wrap">
            {RANDOM_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-8 h-8 rounded-full border border-white/10"
                style={{
                  background: c,
                  transform: color === c ? 'scale(1.2)' : 'none',
                  boxShadow: color === c ? `0 0 10px ${c}` : 'none'
                }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn-ghost flex-1 px-4 py-2.5 text-sm">Cancel</button>
          <button
            onClick={() => {
              if (title && target) {
                onAdd({ title, target_amount: parseFloat(target), current_amount: 0, deadline: deadline || null, color });
              }
            }}
            className="btn-neon flex-1 px-4 py-2.5 text-sm"
          >
            Create Goal
          </button>
        </div>
      </div>
    </div>
  );
}

function AddCategoryModal({ onClose, onAdd }: { onClose: () => void; onAdd: (data: any) => void }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#a855f7');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>New Category</h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-glass w-full px-4 py-3 text-sm" placeholder="Category name" />
          <div className="flex gap-3 flex-wrap">
            {RANDOM_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-8 h-8 rounded-full"
                style={{
                  background: c,
                  transform: color === c ? 'scale(1.2)' : 'scale(1)',
                  boxShadow: color === c ? `0 0 12px ${c}` : 'none',
                  transition: 'all 0.2s',
                }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn-ghost flex-1 px-4 py-2.5 text-sm">Cancel</button>
          <button
            onClick={() => { if (name) onAdd({ name, icon: '🏷', color }); }}
            className="btn-neon flex-1 px-4 py-2.5 text-sm"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

function TabNav({ tabs, active, onChange }: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 p-1 rounded-12" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, width: 'fit-content' }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className="px-4 py-2 text-sm font-medium rounded-10 transition-all"
          style={{
            borderRadius: 10,
            background: active === tab.id ? 'rgba(168,85,247,0.2)' : 'transparent',
            color: active === tab.id ? 'white' : 'var(--text-secondary)',
            border: active === tab.id ? '1px solid rgba(168,85,247,0.3)' : '1px solid transparent',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ icon, text, children }: { icon: React.ReactNode; text: string; children?: React.ReactNode }) {
  return (
    <div className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
      <div className="mb-3 opacity-30 flex justify-center">{icon}</div>
      <p className="text-sm">{text}</p>
      {children}
    </div>
  );
}
