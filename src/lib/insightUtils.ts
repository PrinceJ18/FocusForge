import { Task, FocusSession, Expense } from '../store/useStore';
import { startOfWeek, subWeeks, endOfWeek, differenceInMinutes, parseISO } from 'date-fns';

export interface Insight {
  id: string;
  title: string;
  desc: string;
  color: string;
  icon: string;
}

export function generateInsights({
  tasks,
  focusSessions,
  expenses
}: {
  tasks: Task[];
  focusSessions: FocusSession[];
  expenses: Expense[];
}): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();

  // 1. Focus Comparison
  const currentWeekStart = startOfWeek(now);
  const previousWeekStart = subWeeks(currentWeekStart, 1);
  const previousWeekEnd = endOfWeek(previousWeekStart);

  const thisWeekFocus = focusSessions
    .filter(s => new Date(s.session_date) >= currentWeekStart)
    .reduce((sum, s) => sum + s.minutes, 0);

  const lastWeekFocus = focusSessions
    .filter(s => new Date(s.session_date) >= previousWeekStart && new Date(s.session_date) <= previousWeekEnd)
    .reduce((sum, s) => sum + s.minutes, 0);

  if (lastWeekFocus > 0) {
    const focusDiff = ((thisWeekFocus - lastWeekFocus) / lastWeekFocus) * 100;
    if (focusDiff >= 10) {
      insights.push({
        id: 'focus-up',
        title: 'Focus is Up!',
        desc: `You focused ${Math.round(focusDiff)}% more this week compared to last week.`,
        color: '#10b981', // green
        icon: 'TrendingUp'
      });
    } else if (focusDiff <= -10) {
      insights.push({
        id: 'focus-down',
        title: 'Focus Dropped',
        desc: `You focused ${Math.abs(Math.round(focusDiff))}% less this week.`,
        color: '#f59e0b', // yellow
        icon: 'Timer'
      });
    }
  }

  // 2. Spending Insight
  const thisWeekSpent = expenses
    .filter(e => new Date(e.expense_date) >= currentWeekStart)
    .reduce((sum, e) => sum + e.amount, 0);
    
  const lastWeekSpent = expenses
    .filter(e => new Date(e.expense_date) >= previousWeekStart && new Date(e.expense_date) <= previousWeekEnd)
    .reduce((sum, e) => sum + e.amount, 0);

  if (lastWeekSpent > 0) {
    const diff = lastWeekSpent - thisWeekSpent;
    if (diff > 0) {
      insights.push({
        id: 'spent-less',
        title: 'Great Saving!',
        desc: `You spent ${diff.toFixed(2)} less than last week.`,
        color: '#10b981',
        icon: 'Wallet'
      });
    }
  }

  // 3. Highest Spending Category
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthExpenses = expenses.filter(e => new Date(e.expense_date) >= currentMonthStart);
  if (monthExpenses.length > 0) {
    const categoryTotals = monthExpenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);

    let maxCat = '';
    let maxVal = 0;
    Object.entries(categoryTotals).forEach(([cat, val]) => {
      if (val > maxVal) {
        maxVal = val;
        maxCat = cat;
      }
    });

    if (maxCat) {
      insights.push({
        id: 'high-expense',
        title: 'Highest Spending',
        desc: `Your highest spending category this month is ${maxCat.charAt(0).toUpperCase() + maxCat.slice(1)}.`,
        color: '#ec4899',
        icon: 'AlertTriangle'
      });
    }
  }

  // 4. Longest Focus Session
  if (focusSessions.length > 0) {
    const longest = Math.max(...focusSessions.map(s => s.minutes));
    if (longest > 60) {
      const hrs = Math.floor(longest / 60);
      const mins = longest % 60;
      insights.push({
        id: 'longest-focus',
        title: 'Deep Work Champion',
        desc: `Longest uninterrupted focus: ${hrs}h ${mins}m.`,
        color: '#a855f7',
        icon: 'Brain'
      });
    }
  }

  // Limit to top 4 insights
  return insights.slice(0, 4);
}
