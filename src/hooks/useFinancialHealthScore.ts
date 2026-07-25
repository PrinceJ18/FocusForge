import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { calculateFinancialHealthScore } from '../lib/scoreUtils';

export function useFinancialHealthScore() {
  const { expenses, savingsGoals, profile } = useStore();

  return useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthExpenses = expenses.filter(e => e.expense_date.startsWith(currentMonth));
    const totalSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalExpensesCount = monthExpenses.length;

    // Count unique categories used this month
    const categoriesUsed = new Set(monthExpenses.map(e => e.category));
    const categoriesCount = categoriesUsed.size;

    const hasSavingsGoals = savingsGoals.length > 0;
    const totalSavingsTarget = savingsGoals.reduce((sum, s) => sum + s.target_amount, 0);
    const totalSavingsCurrent = savingsGoals.reduce((sum, s) => sum + s.current_amount, 0);
    const savingsProgressPct = totalSavingsTarget > 0 ? (totalSavingsCurrent / totalSavingsTarget) * 100 : 0;

    return calculateFinancialHealthScore({
      totalSpent,
      monthlyBudget: profile.monthly_budget || 0,
      totalExpensesCount,
      categoriesCount,
      savingsProgressPct,
      hasSavingsGoals,
    });
  }, [expenses, savingsGoals, profile.monthly_budget]);
}
