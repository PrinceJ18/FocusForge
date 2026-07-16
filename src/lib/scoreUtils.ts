import { Task, FocusSession, Expense, SavingsGoal, Profile } from '../store/useStore';

export function calculateProductivityScore({
  tasks,
  focusSessions,
  profile,
}: {
  tasks: Task[];
  focusSessions: FocusSession[];
  profile: Profile;
}): { score: number; label: string } {
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = Math.max(1, tasks.length);
  const taskScore = Math.min(40, (completedTasks / totalTasks) * 40);

  const totalFocusMinutes = focusSessions.reduce((sum, s) => sum + s.minutes, 0);
  const focusScore = totalFocusMinutes > 0 ? Math.min(40, (totalFocusMinutes / 60) * 2) : 0;

  const streakScore = Math.min(20, (profile.streak || 0) * 2);

  const score = Math.round(taskScore + focusScore + streakScore);

  let label = 'Needs Improvement';
  if (score >= 80) label = 'Excellent';
  else if (score >= 60) label = 'Good';
  else if (score >= 40) label = 'Average';

  return { score, label };
}

export function calculateFinancialHealthScore({
  expenses,
  savingsGoals,
  monthlyBudget = 0
}: {
  expenses: Expense[];
  savingsGoals: SavingsGoal[];
  monthlyBudget?: number;
}): { score: number; label: string } {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthExpenses = expenses.filter(e => e.expense_date.startsWith(currentMonth));
  const totalSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  let budgetScore = 50;
  if (monthlyBudget > 0 && totalSpent > monthlyBudget) {
    const overspendRatio = (totalSpent - monthlyBudget) / monthlyBudget;
    budgetScore = Math.max(0, 50 - (overspendRatio * 100));
  } else if (monthlyBudget === 0 && totalSpent > 0) {
    budgetScore = 25; 
  } else if (monthlyBudget === 0 && totalSpent === 0) {
    budgetScore = 50;
  }

  let savingsScore = 50;
  const totalSavingsTarget = savingsGoals.reduce((sum, s) => sum + s.target_amount, 0);
  const totalSavingsCurrent = savingsGoals.reduce((sum, s) => sum + s.current_amount, 0);
  
  if (totalSavingsTarget > 0) {
    savingsScore = Math.min(50, (totalSavingsCurrent / totalSavingsTarget) * 50);
  } else if (savingsGoals.length === 0) {
    savingsScore = 25;
  }

  const score = Math.round(budgetScore + savingsScore);

  let label = 'Needs Attention';
  if (score >= 80) label = 'Excellent';
  else if (score >= 60) label = 'Good';
  else if (score >= 40) label = 'Average';

  return { score, label };
}
