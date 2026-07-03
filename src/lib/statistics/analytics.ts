import { subDays, parseISO, isAfter, format, startOfWeek, subWeeks, addDays, isToday, isThisWeek, isThisMonth } from 'date-fns';
import type { FocusSession, Task, Expense, Profile } from '../../store/useStore';
import { formatCurrency } from '../formatCurrency';

const CATEGORY_COLORS: Record<string, string> = {
  food: '#f59e0b', transport: '#06b6d4', shopping: '#ec4899',
  entertainment: '#a855f7', health: '#10b981', education: '#3b82f6',
  utilities: '#6b7280', other: '#8b5cf6',
};

export interface AnalyticsData {
  combined: Array<{ date: string; spending: number; focus: number }>;
  categoryData: Array<{ name: string; value: number; fill: string }>;
  scatterData: Array<{ x: number; y: number; z: number }>;
  weeklyFocus: Array<{ week: string; minutes: number; hours: number }>;
  insights: Array<{ icon: string; text: string; color: string }>;
  totalSpent: number;
  totalFocus: number;
  heatmap: Array<Array<{ date: string; spending: number; focus: number }>>;
  todayFocusMin: number;
  monthlyFocusMin: number;
  todaySessions: number;
  monthlySessions: number;
  weeklyFocusMin: number;
  todaySpent: number;
  weeklySpent: number;
  monthlySpent: number;
  topCategory: string;
}

export function calculateAnalyticsData(params: {
  expenses: Expense[];
  focusSessions: FocusSession[];
  tasks: Task[];
  profile: Profile;
  period: 'today' | '30d' | '3m';
}): AnalyticsData {
  const { expenses, focusSessions, profile, period } = params;
  const days = period === 'today' ? 1 : period === '30d' ? 30 : 90;

  const since = subDays(new Date(), days);
  const filteredExpenses = expenses.filter((e) => {
    try {
      return isAfter(parseISO(e.expense_date), since);
    } catch {
      return false;
    }
  });
  const filteredSessions = focusSessions.filter((s) => {
    try {
      return isAfter(parseISO(s.session_date), since);
    } catch {
      return false;
    }
  });

  // Daily combined data
  const dailyMap: Record<string, { date: string; spending: number; focus: number }> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
    const label = format(subDays(new Date(), i), 'MMM d');
    dailyMap[d] = { date: label, spending: 0, focus: 0 };
  }

  filteredExpenses.forEach((e) => {
    if (dailyMap[e.expense_date]) {
      dailyMap[e.expense_date].spending += e.amount;
    }
  });

  filteredSessions.forEach((s) => {
    if (dailyMap[s.session_date]) {
      dailyMap[s.session_date].focus += s.minutes;
    }
  });

  const combined = Object.values(dailyMap);

  // Category breakdown
  const catMap: Record<string, number> = {};
  filteredExpenses.forEach((e) => {
    catMap[e.category] = (catMap[e.category] || 0) + e.amount;
  });
  const categoryData = Object.entries(catMap)
    .map(([name, value]) => ({ name, value, fill: CATEGORY_COLORS[name] || '#8b5cf6' }))
    .sort((a, b) => b.value - a.value);

  // Scatter: focus vs spending
  const scatterData = Object.values(dailyMap).map((d) => ({
    x: d.focus,
    y: d.spending,
    z: 10,
  })).filter((d) => d.x > 0 || d.y > 0);

  // Weekly focus data
  const weeklyFocus = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(new Date(), i));
    const weekDays = Array.from({ length: 7 }, (_, j) => addDays(weekStart, j));
    const total = weekDays.reduce((sum, day) => {
      const d = format(day, 'yyyy-MM-dd');
      return sum + (dailyMap[d]?.focus || 0);
    }, 0);
    weeklyFocus.push({
      week: `W${format(weekStart, 'w')}`,
      minutes: total,
      hours: +(total / 60).toFixed(1),
    });
  }

  // Insight generation
  const totalSpent = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const totalFocus = filteredSessions.reduce((s, f) => s + f.minutes, 0);
  const avgDailySpend = totalSpent / days;
  const avgDailyFocus = totalFocus / days;
  const highFocusDays = combined.filter((d) => d.focus > 60);
  const avgSpendOnHighFocusDays = highFocusDays.length > 0
    ? highFocusDays.reduce((s, d) => s + d.spending, 0) / highFocusDays.length
    : 0;

  const insights = generateInsightsInternal({
    totalSpent,
    totalFocus,
    avgDailySpend,
    avgDailyFocus,
    avgSpendOnHighFocusDays,
    days,
    profile,
  });

  // Heatmap data (last 12 weeks)
  const heatmap = [];
  for (let week = 11; week >= 0; week--) {
    const weekData = [];
    for (let day = 0; day < 7; day++) {
      const d = format(subDays(new Date(), week * 7 + (6 - day)), 'yyyy-MM-dd');
      const exp = filteredExpenses.filter((e) => e.expense_date === d).reduce((s, e) => s + e.amount, 0);
      const foc = filteredSessions.find((s) => s.session_date === d)?.minutes || 0;
      weekData.push({ date: d, spending: exp, focus: foc });
    }
    heatmap.push(weekData);
  }

  // Focus stats
  const todayFocusMin = focusSessions
    .filter((s) => {
      try { return isToday(parseISO(s.session_date)); } catch { return false; }
    })
    .reduce((sum, s) => sum + s.minutes, 0);

  const monthlyFocusMin = focusSessions
    .filter((s) => {
      try { return isThisMonth(parseISO(s.session_date)); } catch { return false; }
    })
    .reduce((sum, s) => sum + s.minutes, 0);

  const todaySessions = focusSessions
    .filter((s) => {
      try { return isToday(parseISO(s.session_date)); } catch { return false; }
    })
    .reduce((sum, s) => sum + s.sessions_count, 0);

  const monthlySessions = focusSessions
    .filter((s) => {
      try { return isThisMonth(parseISO(s.session_date)); } catch { return false; }
    })
    .reduce((sum, s) => sum + s.sessions_count, 0);

  const weeklyFocusMin = filteredSessions
    .filter((s) => {
      try { return isThisWeek(parseISO(s.session_date)); } catch { return false; }
    })
    .reduce((sum, s) => sum + s.minutes, 0);

  // Finance stats
  const todaySpent = expenses
    .filter((e) => {
      try { return isToday(parseISO(e.expense_date)); } catch { return false; }
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const weeklySpent = expenses
    .filter((e) => {
      try { return isThisWeek(parseISO(e.expense_date)); } catch { return false; }
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const monthlySpent = expenses
    .filter((e) => {
      try { return isThisMonth(parseISO(e.expense_date)); } catch { return false; }
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const topCategory = categoryData.length > 0 ? categoryData[0].name : 'N/A';

  return {
    combined, categoryData, scatterData, weeklyFocus, insights,
    totalSpent, totalFocus, heatmap,
    todayFocusMin, monthlyFocusMin, todaySessions, monthlySessions, weeklyFocusMin,
    todaySpent, weeklySpent, monthlySpent, topCategory,
  };
}

function generateInsightsInternal({ totalSpent, totalFocus, avgDailySpend, avgDailyFocus, avgSpendOnHighFocusDays, days, profile }: {
  totalSpent: number; totalFocus: number; avgDailySpend: number; avgDailyFocus: number;
  avgSpendOnHighFocusDays: number; days: number; profile: any;
}): Array<{ icon: string; text: string; color: string }> {
  const insights: Array<{ icon: string; text: string; color: string }> = [];

  if (totalFocus === 0 && totalSpent === 0) {
    return [{ icon: '💡', text: 'Start tracking your focus sessions and expenses to get personalized insights.', color: '#a855f7' }];
  }

  if (avgDailyFocus > 60) {
    insights.push({ icon: '🔥', text: `You're averaging ${Math.round(avgDailyFocus)} min of focus per day. Excellent productivity!`, color: '#a855f7' });
  } else if (avgDailyFocus > 0) {
    insights.push({ icon: '💪', text: `You average ${Math.round(avgDailyFocus)} min focus/day. Try for 60+ minutes daily.`, color: '#f59e0b' });
  }

  if (avgDailySpend > 0) {
    const monthly = avgDailySpend * 30;
    insights.push({ icon: '💰', text: `At your current rate, you'll spend ~${formatCurrency(monthly)} this month.`, color: monthly > profile.monthly_budget ? '#ef4444' : '#10b981' });
  }

  if (avgSpendOnHighFocusDays < avgDailySpend && avgSpendOnHighFocusDays > 0) {
    insights.push({ icon: '📊', text: `On high-focus days you spend ${formatCurrency(avgSpendOnHighFocusDays)} vs ${formatCurrency(avgDailySpend)} average — focus saves money!`, color: '#10b981' });
  }

  if (profile.streak >= 7) {
    insights.push({ icon: '⚡', text: `${profile.streak}-day streak! Your consistency is building strong habits.`, color: '#f59e0b' });
  }

  if (totalFocus > 0 && totalSpent > 0) {
    const ratio = totalFocus / totalSpent;
    if (ratio > 1) {
      insights.push({ icon: '🎯', text: `Great balance! You're earning ${ratio.toFixed(1)} focus minutes per dollar spent.`, color: '#06b6d4' });
    }
  }

  if (insights.length === 0) {
    insights.push({ icon: '📈', text: 'Keep logging your activities to unlock personalized insights.', color: '#a855f7' });
  }

  return insights.slice(0, 6);
}
