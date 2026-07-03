import { parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, format } from 'date-fns';
import type { Expense, SavingsGoal } from '../../store/useStore';
import { isDateToday, isDateThisWeek, isDateThisMonth } from './date';

export function calculateTodayExpenses(expenses: Expense[]): number {
  return expenses
    .filter((e) => isDateToday(e.expense_date))
    .reduce((sum, e) => sum + e.amount, 0);
}

export function calculateWeeklyExpenses(expenses: Expense[]): number {
  return expenses
    .filter((e) => isDateThisWeek(e.expense_date))
    .reduce((sum, e) => sum + e.amount, 0);
}

export function calculateMonthlyExpenses(expenses: Expense[]): number {
  return expenses
    .filter((e) => isDateThisMonth(e.expense_date))
    .reduce((sum, e) => sum + e.amount, 0);
}

export function calculateBudgetUsage(expenses: Expense[], monthlyBudget: number) {
  const totalSpent = calculateMonthlyExpenses(expenses);
  const available = monthlyBudget - totalSpent;
  const budgetPct = monthlyBudget > 0 ? (totalSpent / monthlyBudget) * 100 : 0;
  return {
    totalSpent,
    available,
    budgetPct: Math.min(budgetPct, 100),
    budgetPctRaw: budgetPct,
  };
}

export function calculateSavings(savingsGoals: SavingsGoal[]): number {
  return savingsGoals.reduce((sum, g) => sum + g.current_amount, 0);
}

export interface CategoryDataEntry {
  name: string;
  value: number;
  fill?: string;
}

export function calculateCategoryBreakdown(
  expenses: Expense[],
  allCategories: Array<{ id: string; name: string; color: string }>
): CategoryDataEntry[] {
  const monthExp = expenses.filter((e) => isDateThisMonth(e.expense_date));
  const catMap: Record<string, number> = {};

  monthExp.forEach((e) => {
    const cat = allCategories.find((c) => c.id === e.category);
    const key = cat?.name || e.category;
    catMap[key] = (catMap[key] || 0) + e.amount;
  });

  return Object.entries(catMap)
    .map(([name, value]) => ({
      name,
      value,
      fill: allCategories.find((c) => c.name === name)?.color || '#8b5cf6',
    }))
    .sort((a, b) => b.value - a.value);
}

export function calculateDailySpending(expenses: Expense[]) {
  const monthExp = expenses.filter((e) => isDateThisMonth(e.expense_date));
  const start = startOfMonth(new Date());
  const end = new Date() < endOfMonth(new Date()) ? new Date() : endOfMonth(new Date());
  const days = eachDayOfInterval({ start, end });

  return days.map((day) => {
    const dayExp = monthExp.filter((e) => isSameDay(parseISO(e.expense_date), day));
    return {
      day: format(day, 'd'),
      amount: dayExp.reduce((s, e) => s + e.amount, 0),
    };
  });
}
