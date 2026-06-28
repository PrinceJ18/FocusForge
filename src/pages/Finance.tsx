import React, { useState, useMemo } from 'react';
import { Plus, Trash2, TrendingDown, DollarSign, PiggyBank, Tag, X, ChevronDown, BarChart2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { format, isThisMonth, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { formatCurrency } from '../lib/formatCurrency';

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

export default function Finance() {
  const { expenses, savingsGoals, customCategories, profile, user, addExpenseLocal, removeExpenseLocal, updateProfile, setSavingsGoals, setCustomCategories } = useStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'savings' | 'categories'>('overview');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);
  const [newBudget, setNewBudget] = useState(String(profile.monthly_budget));

  const allCategories = useMemo(() => [
    ...DEFAULT_CATEGORIES,
    ...customCategories.map((c) => ({ id: c.id, name: c.name, icon: '🏷', color: c.color })),
  ], [customCategories]);

  const stats = useMemo(() => {
    const monthExp = expenses.filter((e) => isThisMonth(parseISO(e.expense_date)));
    const totalSpent = monthExp.reduce((s, e) => s + e.amount, 0);
    const available = profile.monthly_budget - totalSpent;
    const budgetPct = Math.min((totalSpent / profile.monthly_budget) * 100, 100);

    const catMap: Record<string, number> = {};
    monthExp.forEach((e) => {
      const cat = allCategories.find((c) => c.id === e.category);
      const key = cat?.name || e.category;
      catMap[key] = (catMap[key] || 0) + e.amount;
    });
    const categoryData = Object.entries(catMap).map(([name, value]) => ({
      name,
      value,
      fill: allCategories.find((c) => c.name === name)?.color || '#8b5cf6',
    })).sort((a, b) => b.value - a.value);

    // Daily spending for current month
    const start = startOfMonth(new Date());
    const end = new Date() < endOfMonth(new Date()) ? new Date() : endOfMonth(new Date());
    const days = eachDayOfInterval({ start, end });
    const dailyData = days.map((day) => {
      const dayExp = monthExp.filter((e) => isSameDay(parseISO(e.expense_date), day));
      return {
        day: format(day, 'd'),
        amount: dayExp.reduce((s, e) => s + e.amount, 0),
      };
    });

    return { totalSpent, available, budgetPct, categoryData, dailyData, monthExp };
  }, [expenses, profile.monthly_budget, allCategories]);

  const totalSavings = savingsGoals.reduce((s, g) => s + g.current_amount, 0);

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
                          formatter={(val: number) => [`${formatCurrency(val)}`, '']}
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
                        <div className="text-right">
                          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                            {formatCurrency(cat.value)}
                          </span>
                          <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
                            ({((cat.value / stats.totalSpent) * 100).toFixed(0)}%)
                          </span>
                        </div>
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
                      formatter={(val: number) => [`${formatCurrency(val)}`, 'Spent']}
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
                      setSavingsGoals(savingsGoals.filter((g) => g.id !== goal.id));
                      if (user) await supabase.from('savings_goals').delete().eq('id', goal.id);
                    }}
                    onAddFunds={async (amount) => {
                      const updated = { ...goal, current_amount: goal.current_amount + amount };
                      setSavingsGoals(savingsGoals.map((g) => (g.id === goal.id ? updated : g)));
                      if (user) {
                        await supabase.from('savings_goals').update({
                          current_amount: updated.current_amount,
                          updated_at: new Date().toISOString(),
                        }).eq('id', goal.id);
                      }
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="glass-card p-8">
                <EmptyState icon={<PiggyBank size={32} />} text="No savings goals yet">
                  <button
                    onClick={() => setShowAddGoal(true)}
                    className="btn-neon px-4 py-2 text-sm mt-3"
                    style={{ borderRadius: 10 }}
                  >
                    Create First Goal
                  </button>
                </EmptyState>
              </div>
            )}
          </div>
        )
      }

      {/* Categories tab */}
      {
        activeTab === 'categories' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Expense Categories</h3>
              <button
                onClick={() => setShowAddCategory(true)}
                className="btn-neon px-3 py-2 text-sm flex items-center gap-1.5"
                style={{ borderRadius: 10 }}
              >
                <Plus size={14} /> New Category
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {allCategories.map((cat) => {
                const spent = stats.monthExp
                  .filter((e) => e.category === cat.id)
                  .reduce((s, e) => s + e.amount, 0);
                return (
                  <div
                    key={cat.id}
                    className="glass-card p-4 text-center"
                    style={{ borderColor: `${cat.color}30` }}
                  >
                    <div className="text-2xl mb-2">{cat.icon}</div>
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{cat.name}</p>
                    <p className="text-xs" style={{ color: cat.color }}>{formatCurrency(spent)}</p>
                    {customCategories.find((c) => c.id === cat.id) && (
                      <button
                        className="mt-2 text-xs"
                        style={{ color: '#ef4444' }}
                        onClick={async () => {
                          setCustomCategories(customCategories.filter((c) => c.id !== cat.id));
                          if (user) await supabase.from('custom_categories').delete().eq('id', cat.id);
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )
      }

      {/* Floating Add Expense Button */}
      {
        activeTab !== 'expenses' && (
          <button
            onClick={() => setShowAddExpense(true)}
            className="fixed bottom-24 right-6 w-14 h-14 rounded-full btn-neon flex items-center justify-center shadow-lg md:bottom-8"
            style={{ zIndex: 50 }}
          >
            <Plus size={24} />
          </button>
        )
      }

      {/* Modals */}
      {
        showAddExpense && (
          <AddExpenseModal
            categories={allCategories}
            onClose={() => setShowAddExpense(false)}
            onAdd={async (data) => {
              const newExp = {
                id: crypto.randomUUID(),
                user_id: user?.id || 'local',
                ...data,
                created_at: new Date().toISOString(),
              };
              addExpenseLocal(newExp);
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
                  useStore.getState().removeExpenseLocal(newExp.id);
                  useStore.getState().addExpenseLocal(inserted);
                }
              }
              setShowAddExpense(false);
            }}
          />
        )
      }

      {
        showAddGoal && (
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
        )
      }

      {
        showAddCategory && (
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
        )
      }

      {
        showBudgetEdit && (
          <div className="modal-overlay" onClick={() => setShowBudgetEdit(false)}>
            <div className="modal-content p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>
                Edit Monthly Budget
              </h3>
              <input
                type="number"
                min = "1"
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
        )
      }
    </div >
  );
}

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
        <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{goal.title}</h4>
        <button onClick={onDelete} style={{ color: 'var(--text-muted)' }}>
          <Trash2 size={14} />
        </button>
      </div>
      <div className="flex justify-between text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
        <span>{formatCurrency(goal.current_amount)}</span>
        <span>{formatCurrency(goal.target_amount)}</span>
      </div>
      <div className="progress-bar mb-3">
        <div className="progress-fill" style={{ width: `${pct}%`, background: goal.color }} />
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{pct.toFixed(0)}% completed</p>
      <div className="flex gap-2">
        <input
          type="number"
          min = "1"
          placeholder="Add funds"
          value={addAmount}
          onChange={(e) => setAddAmount(e.target.value)}
          className="input-glass flex-1 px-3 py-2 text-sm"
        />
        <button
          onClick={() => {
            const val = parseFloat(addAmount);
            if (!isNaN(val) && val > 0) {
              onAddFunds(val);
              setAddAmount('');
            }
          }}
          className="btn-neon px-3 py-2 text-sm"
          style={{ borderRadius: 10 }}
        >
          Add
        </button>
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
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-glass w-full px-4 py-3 text-sm"
              placeholder="Coffee, Groceries..."
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Amount ({formatCurrency(0)})</label>
              <input
                type="number"
                min = "1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-glass w-full px-4 py-3 text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-glass w-full px-4 py-3 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-glass w-full px-4 py-3 text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input-glass w-full px-4 py-3 text-sm"
              placeholder="Optional note..."
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn-ghost flex-1 px-4 py-2.5 text-sm">Cancel</button>
          <button
            onClick={() => {
              if (title && amount) {
                onAdd({ title, amount: parseFloat(amount), category, note, expense_date: date });
              }
            }}
            className="btn-neon flex-1 px-4 py-2.5 text-sm"
          >
            Add Expense
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
          <input type="number" min="1" value={target} onChange={(e) => setTarget(e.target.value)} className="input-glass w-full px-4 py-3 text-sm" placeholder="Target amount ({formatCurrency(0)})" />
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="input-glass w-full px-4 py-3 text-sm" />
          <div className="flex gap-3 flex-wrap">
            {RANDOM_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-8 h-8 rounded-full transition-transform"
                style={{
                  background: c,
                  transform: color === c ? 'scale(1.2)' : 'scale(1)',
                  boxShadow: color === c ? `0 0 12px ${c}` : 'none',
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
