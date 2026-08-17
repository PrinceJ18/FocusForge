import { Task, FocusSession, Expense, Profile } from '../store/useStore';
import type { AppEvent } from './events';
import { formatCurrency } from './formatCurrency';
import { startOfWeek, subWeeks, endOfWeek, isThisMonth, parseISO } from 'date-fns';

export interface Insight {
  id: string;
  title: string;
  desc: string;
  color: string;
  icon: string;
  category: 'productivity' | 'finance' | 'budget' | 'focus' | 'tasks' | 'streak';
  recommendation?: string;
  badge?: string;
}

export function generateInsights({
  tasks = [],
  focusSessions = [],
  expenses = [],
  profile,
  events = [],
}: {
  tasks: Task[];
  focusSessions: FocusSession[];
  expenses: Expense[];
  profile?: Profile;
  events?: AppEvent[];
}): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();

  // 1. Focus Week-over-Week Comparison
  const currentWeekStart = startOfWeek(now);
  const previousWeekStart = subWeeks(currentWeekStart, 1);
  const previousWeekEnd = endOfWeek(previousWeekStart);

  const thisWeekFocus = focusSessions
    .filter((s) => {
      try {
        return new Date(s.session_date) >= currentWeekStart;
      } catch {
        return false;
      }
    })
    .reduce((sum, s) => sum + s.minutes, 0);

  const lastWeekFocus = focusSessions
    .filter((s) => {
      try {
        const d = new Date(s.session_date);
        return d >= previousWeekStart && d <= previousWeekEnd;
      } catch {
        return false;
      }
    })
    .reduce((sum, s) => sum + s.minutes, 0);

  if (lastWeekFocus > 0) {
    const focusDiff = ((thisWeekFocus - lastWeekFocus) / lastWeekFocus) * 100;
    if (focusDiff >= 15) {
      insights.push({
        id: 'focus-up',
        title: 'Focus Surge',
        desc: `You focused ${Math.round(focusDiff)}% more this week (${Math.round(thisWeekFocus)} min) compared to last week (${Math.round(lastWeekFocus)} min).`,
        recommendation: 'Maintain your current cadence by scheduling key tasks early in your prime hours.',
        badge: `+${Math.round(focusDiff)}% Focus`,
        color: '#10b981',
        icon: 'TrendingUp',
        category: 'focus',
      });
    } else if (focusDiff <= -20) {
      insights.push({
        id: 'focus-down',
        title: 'Focus Velocity Slowdown',
        desc: `Deep work dropped ${Math.abs(Math.round(focusDiff))}% this week compared to last week.`,
        recommendation: 'Try starting tomorrow with a 25-minute single-task focus block.',
        badge: `${Math.round(focusDiff)}% Dip`,
        color: '#f59e0b',
        icon: 'Timer',
        category: 'focus',
      });
    }
  }

  // 2. Best Focus Time of Day (from events or focus sessions)
  const hourBuckets: Record<string, number> = {
    'Morning (8 AM - 12 PM)': 0,
    'Afternoon (12 PM - 4 PM)': 0,
    'Evening (4 PM - 8 PM)': 0,
    'Night (8 PM - 12 AM)': 0,
  };

  events.forEach((ev) => {
    if (ev.category === 'focus' && ev.timestamp) {
      try {
        const hour = new Date(ev.timestamp).getHours();
        if (hour >= 8 && hour < 12) hourBuckets['Morning (8 AM - 12 PM)'] += 1;
        else if (hour >= 12 && hour < 16) hourBuckets['Afternoon (12 PM - 4 PM)'] += 1;
        else if (hour >= 16 && hour < 20) hourBuckets['Evening (4 PM - 8 PM)'] += 1;
        else hourBuckets['Night (8 PM - 12 AM)'] += 1;
      } catch {
        // ignore
      }
    }
  });

  let bestHour = '';
  let maxCount = 0;
  Object.entries(hourBuckets).forEach(([w, count]) => {
    if (count > maxCount) {
      maxCount = count;
      bestHour = w;
    }
  });

  if (bestHour && maxCount >= 2) {
    insights.push({
      id: 'peak-hours',
      title: 'Peak Productivity Window',
      desc: `Your highest output occurs in the ${bestHour}.`,
      recommendation: `Block this time window on your calendar for complex, high-priority tasks.`,
      badge: 'Peak Energy',
      color: '#a855f7',
      icon: 'Brain',
      category: 'productivity',
    });
  }

  // 3. Spending Comparison & Category Surge
  const thisWeekSpent = expenses
    .filter((e) => {
      try {
        return new Date(e.expense_date) >= currentWeekStart;
      } catch {
        return false;
      }
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const lastWeekSpent = expenses
    .filter((e) => {
      try {
        const d = new Date(e.expense_date);
        return d >= previousWeekStart && d <= previousWeekEnd;
      } catch {
        return false;
      }
    })
    .reduce((sum, e) => sum + e.amount, 0);

  if (lastWeekSpent > 0 && thisWeekSpent < lastWeekSpent) {
    const diff = lastWeekSpent - thisWeekSpent;
    insights.push({
      id: 'spent-less',
      title: 'Financial Savings Trend',
      desc: `You spent ${formatCurrency(diff)} less this week compared to the previous week.`,
      recommendation: 'Consider allocating the saved amount toward your active savings goals.',
      badge: 'Controlled Spend',
      color: '#10b981',
      icon: 'Wallet',
      category: 'finance',
    });
  } else if (lastWeekSpent > 0 && thisWeekSpent > lastWeekSpent * 1.25) {
    const surgeDiff = Math.round(((thisWeekSpent - lastWeekSpent) / lastWeekSpent) * 100);
    insights.push({
      id: 'spend-surge',
      title: 'Spending Acceleration',
      desc: `Weekly expenses rose ${surgeDiff}% (${formatCurrency(thisWeekSpent)} vs ${formatCurrency(lastWeekSpent)}).`,
      recommendation: 'Review your recent purchases to ensure non-essential categories stay within budget.',
      badge: `+${surgeDiff}% Spend`,
      color: '#ec4899',
      icon: 'AlertTriangle',
      category: 'finance',
    });
  }

  // 4. Budget Burn-rate Prediction
  if (profile && profile.monthly_budget > 0) {
    const monthExpenses = expenses.filter((e) => {
      try {
        return isThisMonth(parseISO(e.expense_date));
      } catch {
        return false;
      }
    });
    const monthlySpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dailyRate = dayOfMonth > 0 ? monthlySpent / dayOfMonth : 0;
    const projectedSpend = dailyRate * daysInMonth;

    if (projectedSpend > profile.monthly_budget * 1.05 && dayOfMonth >= 7) {
      const overAmount = Math.round(projectedSpend - profile.monthly_budget);
      insights.push({
        id: 'budget-burn',
        title: 'Budget Runway Warning',
        desc: `At your current burn rate (${formatCurrency(dailyRate)}/day), you are projected to exceed your monthly budget by ${formatCurrency(overAmount)}.`,
        recommendation: 'Pace daily expenses over the remaining days of the month to avoid overspending.',
        badge: 'Forecast Risk',
        color: '#ef4444',
        icon: 'AlertTriangle',
        category: 'budget',
      });
    } else if (projectedSpend <= profile.monthly_budget * 0.85 && monthlySpent > 0) {
      insights.push({
        id: 'budget-healthy',
        title: 'Optimal Budget Runway',
        desc: `You are tracking ${Math.round(100 - (projectedSpend / profile.monthly_budget) * 100)}% under your monthly budget limit.`,
        recommendation: 'Great fiscal discipline! Your extra buffer can accelerate savings goals.',
        badge: 'On Track',
        color: '#10b981',
        icon: 'Wallet',
        category: 'budget',
      });
    }
  }

  // 5. Task Velocity & Priority Execution
  const highPriorityTasks = tasks.filter((t) => t.priority === 'high');
  const highCompleted = highPriorityTasks.filter((t) => t.status === 'completed').length;
  if (highPriorityTasks.length >= 3) {
    const highRate = Math.round((highCompleted / highPriorityTasks.length) * 100);
    if (highRate >= 75) {
      insights.push({
        id: 'high-priority-mastery',
        title: 'High-Impact Task Velocity',
        desc: `You have completed ${highRate}% of your high-priority tasks (${highCompleted}/${highPriorityTasks.length}).`,
        recommendation: 'Focusing on high-leverage tasks drives disproportionate productivity gains.',
        badge: `${highRate}% High-Impact`,
        color: '#a855f7',
        icon: 'CheckCircle',
        category: 'tasks',
      });
    }
  }

  // 6. Streak Milestones
  if (profile && profile.streak > 0) {
    if (profile.streak >= 7) {
      insights.push({
        id: 'streak-momentum',
        title: `${profile.streak}-Day Active Streak`,
        desc: `You have maintained active productivity for ${profile.streak} consecutive days.`,
        recommendation: 'Consistency compounds: continue completing at least 1 focus block daily.',
        badge: 'Unstoppable',
        color: '#f59e0b',
        icon: 'TrendingUp',
        category: 'streak',
      });
    }
  }

  // 7. Longest Focus Session Deep Work
  if (focusSessions.length > 0) {
    const longest = Math.max(...focusSessions.map((s) => s.minutes));
    if (longest >= 60) {
      const hrs = Math.floor(longest / 60);
      const mins = longest % 60;
      insights.push({
        id: 'deep-work-record',
        title: 'Deep Work Endurance',
        desc: `Your longest single focus session reached ${hrs > 0 ? `${hrs}h ` : ''}${mins}m.`,
        recommendation: 'Long deep work blocks are ideal for creative problem solving and engineering.',
        badge: `${longest}m Session`,
        color: '#06b6d4',
        icon: 'Brain',
        category: 'focus',
      });
    }
  }

  // 8. Fallback for new / developing accounts
  if (insights.length === 0) {
    insights.push({
      id: 'welcome-insight',
      title: 'Building Your Intelligence Baseline',
      desc: 'Complete focus sessions, complete daily tasks, and log expenses to unlock smart AI insights.',
      recommendation: 'Start your first 25-minute Pomodoro session today.',
      badge: 'Getting Started',
      color: '#a855f7',
      icon: 'Brain',
      category: 'productivity',
    });
  }

  return insights.slice(0, 6);
}
