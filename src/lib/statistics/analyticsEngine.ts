import {
  subDays,
  parseISO,
  format,
  startOfWeek,
  subWeeks,
  addDays,
  isToday,
  isThisWeek,
  isThisMonth,
  getDaysInMonth,
  getDate,
} from 'date-fns';
import type { FocusSession, Task, Expense, Profile, SavingsGoal } from '../../store/useStore';
import type { AppEvent } from '../events';
import { calculateProductivityScore, calculateFinancialHealthScore } from '../scoreUtils';

export const CATEGORY_COLORS: Record<string, string> = {
  food: '#f59e0b',
  transport: '#06b6d4',
  shopping: '#ec4899',
  entertainment: '#a855f7',
  health: '#10b981',
  education: '#3b82f6',
  utilities: '#6b7280',
  other: '#8b5cf6',
};

export type AnalyticsPeriod = '7d' | '30d' | '90d' | 'all';

export interface PriorityBreakdown {
  total: number;
  completed: number;
  rate: number;
}

export interface CategoryShare {
  name: string;
  value: number;
  percentage: number;
  fill: string;
}

export interface ForecastData {
  projectedMonthEndSpend: number;
  projectedMonthEndFocusHours: number;
  daysUntilBudgetExhaustion: number | null;
  budgetHealthStatus: 'healthy' | 'caution' | 'critical';
  dailyBurnRate: number;
}

export interface AnalyticsEngineResult {
  // Period & Summary
  period: AnalyticsPeriod;
  daysCount: number;
  hasData: boolean;
  totalSpent: number;
  totalFocusMin: number;
  totalFocusHours: number;
  completedTasksCount: number;
  totalTasksCount: number;
  taskCompletionRate: number;

  // Productivity
  todayFocusMin: number;
  weeklyFocusMin: number;
  monthlyFocusMin: number;
  todaySessions: number;
  monthlySessions: number;
  avgSessionLength: number;
  longestSessionMins: number;
  bestFocusDay: { dayName: string; totalMinutes: number; avgMinutes: number };
  bestFocusHour: { timeWindow: string; sessionCount: number };
  currentStreak: number;
  longestStreak: number;
  focusConsistencyRate: number;
  priorityDistribution: {
    high: PriorityBreakdown;
    medium: PriorityBreakdown;
    low: PriorityBreakdown;
  };
  weeklyFocusBars: Array<{ week: string; minutes: number; hours: number }>;

  // Finance
  todaySpent: number;
  weeklySpent: number;
  monthlySpent: number;
  availableBudget: number;
  budgetUtilizationPct: number;
  budgetHealth: 'Healthy' | 'Warning' | 'Critical';
  avgDailySpend: number;
  topCategory: { name: string; amount: number; percentage: number };
  categoryBreakdown: CategoryShare[];
  largestExpense: { title: string; amount: number; date: string; category: string } | null;

  // Comparisons vs Previous Equal Period
  comparison: {
    focusGrowthPct: number;
    spendingChangePct: number;
    tasksGrowthPct: number;
  };

  // Scores & Correlation
  productivityScore: number;
  productivityScoreLabel: string;
  financialScore: number;
  financialScoreLabel: string;
  overallWellnessScore: number;
  overallWellnessLabel: string;
  focusDollarRatio: number; // minutes of focus per dollar spent

  // Chart Datasets
  dailyTimeline: Array<{
    date: string;
    rawDate: string;
    focus: number;
    spending: number;
    tasksCompleted: number;
  }>;
  scatterData: Array<{ x: number; y: number; z: number; date: string }>;
  heatmap: Array<Array<{ date: string; spending: number; focus: number }>>;

  // Forecast
  forecast: ForecastData;
}

export function calculateAnalyticsEngineData(params: {
  expenses: Expense[];
  focusSessions: FocusSession[];
  tasks: Task[];
  profile: Profile;
  savingsGoals?: SavingsGoal[];
  events?: AppEvent[];
  period: AnalyticsPeriod;
}): AnalyticsEngineResult {
  const {
    expenses = [],
    focusSessions = [],
    tasks = [],
    profile,
    savingsGoals = [],
    events = [],
    period = '30d',
  } = params;

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  // 1. Determine Exact Date Bounds for Selected Period
  let daysCount: number;
  let startDateStr: string;

  if (period === '7d') {
    daysCount = 7;
    startDateStr = format(subDays(now, 6), 'yyyy-MM-dd');
  } else if (period === '30d') {
    daysCount = 30;
    startDateStr = format(subDays(now, 29), 'yyyy-MM-dd');
  } else if (period === '90d') {
    daysCount = 90;
    startDateStr = format(subDays(now, 89), 'yyyy-MM-dd');
  } else {
    // 'all' time: calculate span from earliest recorded activity
    const recordedDates: string[] = [
      ...expenses.map((e) => e.expense_date?.slice(0, 10)).filter(Boolean),
      ...focusSessions.map((s) => s.session_date?.slice(0, 10)).filter(Boolean),
      ...tasks
        .map((t) => (t.completed_at || t.scheduled_date || t.created_at)?.slice(0, 10))
        .filter(Boolean),
    ].sort();

    if (recordedDates.length > 0 && recordedDates[0] < todayStr) {
      startDateStr = recordedDates[0];
      try {
        const diffMs = now.getTime() - parseISO(startDateStr).getTime();
        daysCount = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      } catch {
        startDateStr = format(subDays(now, 364), 'yyyy-MM-dd');
        daysCount = 365;
      }
    } else {
      startDateStr = format(subDays(now, 29), 'yyyy-MM-dd');
      daysCount = 30;
    }
  }

  // Previous comparison period boundaries
  const prevEndDateStr = format(subDays(parseISO(startDateStr), 1), 'yyyy-MM-dd');
  const prevStartDateStr = format(subDays(parseISO(startDateStr), daysCount), 'yyyy-MM-dd');

  // 2. Filter Single Source of Truth Datasets
  const currentExpenses = expenses.filter((e) => {
    const d = e.expense_date?.slice(0, 10);
    if (!d) return false;
    return period === 'all' ? d <= todayStr : d >= startDateStr && d <= todayStr;
  });

  const previousExpenses = expenses.filter((e) => {
    const d = e.expense_date?.slice(0, 10);
    if (!d) return false;
    return d >= prevStartDateStr && d <= prevEndDateStr;
  });

  const currentSessions = focusSessions.filter((s) => {
    const d = s.session_date?.slice(0, 10);
    if (!d) return false;
    return period === 'all' ? d <= todayStr : d >= startDateStr && d <= todayStr;
  });

  const previousSessions = focusSessions.filter((s) => {
    const d = s.session_date?.slice(0, 10);
    if (!d) return false;
    return d >= prevStartDateStr && d <= prevEndDateStr;
  });

  const currentTasks = tasks.filter((t) => {
    const d = (t.completed_at || t.scheduled_date || t.created_at)?.slice(0, 10);
    if (!d) return true; // keep unscheduled tasks in pool
    return period === 'all' ? d <= todayStr : d >= startDateStr && d <= todayStr;
  });

  const hasData = expenses.length > 0 || focusSessions.length > 0 || tasks.length > 0;

  // 3. Build Daily Timeline Exclusively From Current Period Range
  const timelineMap: Record<
    string,
    { date: string; rawDate: string; focus: number; spending: number; tasksCompleted: number }
  > = {};

  const timelineDays = Math.min(daysCount, 90); // Cap timeline display points to 90 for clean chart rendering
  for (let i = timelineDays - 1; i >= 0; i--) {
    const target = subDays(now, i);
    const dKey = format(target, 'yyyy-MM-dd');
    const label = format(target, timelineDays <= 14 ? 'EEE, MMM d' : 'MMM d');
    timelineMap[dKey] = {
      date: label,
      rawDate: dKey,
      focus: 0,
      spending: 0,
      tasksCompleted: 0,
    };
  }

  currentExpenses.forEach((e) => {
    const d = e.expense_date?.slice(0, 10);
    if (d && timelineMap[d]) {
      timelineMap[d].spending += e.amount;
    }
  });

  currentSessions.forEach((s) => {
    const d = s.session_date?.slice(0, 10);
    if (d && timelineMap[d]) {
      timelineMap[d].focus += s.minutes;
    }
  });

  tasks.forEach((t) => {
    if (t.status === 'completed' && t.completed_at) {
      const cDate = t.completed_at.slice(0, 10);
      if (timelineMap[cDate]) {
        timelineMap[cDate].tasksCompleted += 1;
      }
    }
  });

  const dailyTimeline = Object.values(timelineMap);

  // 4. Productivity Metrics (Strictly from Current Filtered Dataset)
  const totalFocusMin = currentSessions.reduce((sum, s) => sum + s.minutes, 0);
  const totalFocusHours = parseFloat((totalFocusMin / 60).toFixed(1));
  const totalSessionsCount = currentSessions.reduce((sum, s) => sum + (s.sessions_count || 1), 0);
  const avgSessionLength = totalSessionsCount > 0 ? Math.round(totalFocusMin / totalSessionsCount) : 0;
  const longestSessionMins = currentSessions.reduce((max, s) => Math.max(max, s.minutes), 0);

  // Best focus day of week
  const dayOfWeekFocus: Record<string, { total: number; count: number }> = {
    Sunday: { total: 0, count: 0 },
    Monday: { total: 0, count: 0 },
    Tuesday: { total: 0, count: 0 },
    Wednesday: { total: 0, count: 0 },
    Thursday: { total: 0, count: 0 },
    Friday: { total: 0, count: 0 },
    Saturday: { total: 0, count: 0 },
  };

  currentSessions.forEach((s) => {
    try {
      const dayName = format(parseISO(s.session_date), 'EEEE');
      if (dayOfWeekFocus[dayName]) {
        dayOfWeekFocus[dayName].total += s.minutes;
        dayOfWeekFocus[dayName].count += 1;
      }
    } catch {
      // ignore
    }
  });

  let bestDayName = 'N/A';
  let bestDayTotal = 0;
  let bestDayAvg = 0;

  Object.entries(dayOfWeekFocus).forEach(([name, val]) => {
    if (val.total > bestDayTotal) {
      bestDayTotal = val.total;
      bestDayName = name;
      bestDayAvg = val.count > 0 ? Math.round(val.total / val.count) : 0;
    }
  });

  // Best focus hour window from events in period
  const hourBuckets: Record<string, number> = {
    'Morning (8 AM - 12 PM)': 0,
    'Afternoon (12 PM - 4 PM)': 0,
    'Evening (4 PM - 8 PM)': 0,
    'Night (8 PM - 12 AM)': 0,
  };

  events.forEach((ev) => {
    if (ev.category === 'focus' && ev.timestamp) {
      const evDate = ev.timestamp.slice(0, 10);
      if (period === 'all' || (evDate >= startDateStr && evDate <= todayStr)) {
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
    }
  });

  let bestHourWindow = 'Morning (8 AM - 12 PM)';
  let bestHourCount = 0;
  Object.entries(hourBuckets).forEach(([w, count]) => {
    if (count > bestHourCount) {
      bestHourCount = count;
      bestHourWindow = w;
    }
  });

  // Focus Consistency Rate (active days with >= 30m / days in period)
  const activeFocusDaysCount = dailyTimeline.filter((d) => d.focus >= 30).length;
  const focusConsistencyRate = Math.min(100, Math.round((activeFocusDaysCount / Math.max(1, timelineDays)) * 100));

  // Task Priority & Completion for Current Period
  const priorityDistribution: {
    high: PriorityBreakdown;
    medium: PriorityBreakdown;
    low: PriorityBreakdown;
  } = {
    high: { total: 0, completed: 0, rate: 0 },
    medium: { total: 0, completed: 0, rate: 0 },
    low: { total: 0, completed: 0, rate: 0 },
  };

  currentTasks.forEach((t) => {
    const p = (t.priority as 'high' | 'medium' | 'low') || 'medium';
    if (priorityDistribution[p]) {
      priorityDistribution[p].total += 1;
      if (t.status === 'completed') {
        priorityDistribution[p].completed += 1;
      }
    }
  });

  (['high', 'medium', 'low'] as const).forEach((p) => {
    const total = priorityDistribution[p].total;
    const completed = priorityDistribution[p].completed;
    priorityDistribution[p].rate = total > 0 ? Math.round((completed / total) * 100) : 0;
  });

  const totalTasksCount = currentTasks.length;
  const completedTasksCount = currentTasks.filter((t) => t.status === 'completed').length;
  const taskCompletionRate =
    totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // Weekly focus bar chart data (last 4 weeks)
  const weeklyFocusBars: Array<{ week: string; minutes: number; hours: number }> = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(now, i));
    const weekDays = Array.from({ length: 7 }, (_, j) => addDays(weekStart, j));
    const total = weekDays.reduce((sum, day) => {
      const dStr = format(day, 'yyyy-MM-dd');
      return sum + (timelineMap[dStr]?.focus || 0);
    }, 0);
    weeklyFocusBars.push({
      week: `W${format(weekStart, 'w')}`,
      minutes: total,
      hours: parseFloat((total / 60).toFixed(1)),
    });
  }

  // 5. Finance Metrics (Strictly from Current Filtered Dataset)
  const totalSpent = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
  const avgDailySpend = daysCount > 0 ? parseFloat((totalSpent / daysCount).toFixed(2)) : 0;

  // Period budget scaling
  const baseMonthlyBudget = profile?.monthly_budget || 0;
  const periodBudget = period === '30d' 
    ? baseMonthlyBudget 
    : period === '7d' 
    ? Math.round((baseMonthlyBudget / 30) * 7) 
    : period === '90d' 
    ? Math.round(baseMonthlyBudget * 3) 
    : Math.round((baseMonthlyBudget / 30) * daysCount);

  const availableBudget = Math.max(0, periodBudget - totalSpent);
  const budgetUtilizationPct =
    periodBudget > 0 ? Math.min(100, Math.round((totalSpent / periodBudget) * 100)) : 0;

  let budgetHealth: 'Healthy' | 'Warning' | 'Critical' = 'Healthy';
  if (budgetUtilizationPct >= 90) budgetHealth = 'Critical';
  else if (budgetUtilizationPct >= 70) budgetHealth = 'Warning';

  // Category allocation strictly from currentExpenses
  const categoryTotals: Record<string, number> = {};
  currentExpenses.forEach((e) => {
    const cat = e.category || 'other';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + e.amount;
  });

  const categoryBreakdown: CategoryShare[] = Object.entries(categoryTotals)
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      percentage: totalSpent > 0 ? Math.round((value / totalSpent) * 100) : 0,
      fill: CATEGORY_COLORS[name.toLowerCase()] || '#8b5cf6',
    }))
    .sort((a, b) => b.value - a.value);

  const topCategory = categoryBreakdown.length > 0
    ? {
        name: categoryBreakdown[0].name,
        amount: categoryBreakdown[0].value,
        percentage: categoryBreakdown[0].percentage,
      }
    : { name: 'None', amount: 0, percentage: 0 };

  // Largest single expense strictly within currentExpenses
  let largestExpense: { title: string; amount: number; date: string; category: string } | null = null;
  currentExpenses.forEach((e) => {
    if (!largestExpense || e.amount > largestExpense.amount) {
      largestExpense = {
        title: e.title,
        amount: e.amount,
        date: e.expense_date,
        category: e.category,
      };
    }
  });

  // 6. Comparison vs Equal Previous Period
  const prevTotalSpent = previousExpenses.reduce((sum, e) => sum + e.amount, 0);
  const prevTotalFocus = previousSessions.reduce((sum, s) => sum + s.minutes, 0);

  const spendingChangePct = prevTotalSpent > 0
    ? Math.round(((totalSpent - prevTotalSpent) / prevTotalSpent) * 100)
    : 0;

  const focusGrowthPct = prevTotalFocus > 0
    ? Math.round(((totalFocusMin - prevTotalFocus) / prevTotalFocus) * 100)
    : 0;

  const tasksGrowthPct = 0;

  // 7. Standard Single-Day Totals (for contextual indicators)
  const todaySpent = expenses
    .filter((e) => {
      try {
        return isToday(parseISO(e.expense_date));
      } catch {
        return false;
      }
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const weeklySpent = expenses
    .filter((e) => {
      try {
        return isThisWeek(parseISO(e.expense_date));
      } catch {
        return false;
      }
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const monthlySpent = expenses
    .filter((e) => {
      try {
        return isThisMonth(parseISO(e.expense_date));
      } catch {
        return false;
      }
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const todayFocusMin = focusSessions
    .filter((s) => {
      try {
        return isToday(parseISO(s.session_date));
      } catch {
        return false;
      }
    })
    .reduce((sum, s) => sum + s.minutes, 0);

  const monthlyFocusMin = focusSessions
    .filter((s) => {
      try {
        return isThisMonth(parseISO(s.session_date));
      } catch {
        return false;
      }
    })
    .reduce((sum, s) => sum + s.minutes, 0);

  const todaySessions = focusSessions
    .filter((s) => {
      try {
        return isToday(parseISO(s.session_date));
      } catch {
        return false;
      }
    })
    .reduce((sum, s) => sum + (s.sessions_count || 1), 0);

  const monthlySessions = focusSessions
    .filter((s) => {
      try {
        return isThisMonth(parseISO(s.session_date));
      } catch {
        return false;
      }
    })
    .reduce((sum, s) => sum + (s.sessions_count || 1), 0);

  const weeklyFocusMin = focusSessions
    .filter((s) => {
      try {
        return isThisWeek(parseISO(s.session_date));
      } catch {
        return false;
      }
    })
    .reduce((sum, s) => sum + s.minutes, 0);

  // 8. Composite Scores (Scaled strictly to the selected period)
  const targetPeriodFocus = daysCount * 120; // 120 min daily target scaled over period days
  const prodScoreObj = calculateProductivityScore({
    completedTasks: completedTasksCount,
    totalTasks: totalTasksCount,
    focusMinutes: totalFocusMin,
    focusGoal: Math.max(120, targetPeriodFocus),
    streak: profile?.streak || 0,
    hasActivity: currentSessions.length > 0 || currentExpenses.length > 0 || currentTasks.length > 0,
    budgetHealth,
    challengeCompleted: false,
  });

  const finScoreObj = calculateFinancialHealthScore({
    totalSpent,
    monthlyBudget: periodBudget,
    totalExpensesCount: currentExpenses.length,
    categoriesCount: Object.keys(categoryTotals).length,
    savingsProgressPct: 50,
    hasSavingsGoals: savingsGoals.length > 0,
  });

  const streakWeight = Math.min(100, (profile?.streak || 0) * 10);
  const overallWellnessScore = Math.round(
    prodScoreObj.score * 0.45 + finScoreObj.score * 0.45 + streakWeight * 0.1
  );

  let overallWellnessLabel = 'Developing';
  if (overallWellnessScore >= 80) overallWellnessLabel = 'Elite';
  else if (overallWellnessScore >= 60) overallWellnessLabel = 'Strong';
  else if (overallWellnessScore >= 40) overallWellnessLabel = 'Balanced';

  const focusDollarRatio =
    totalSpent > 0 ? parseFloat((totalFocusMin / totalSpent).toFixed(1)) : totalFocusMin > 0 ? 99 : 0;

  // 9. Scatter Plot Data
  const scatterData = dailyTimeline
    .map((d) => ({
      x: d.focus,
      y: d.spending,
      z: 10,
      date: d.date,
    }))
    .filter((d) => d.x > 0 || d.y > 0);

  // 10. 12-Week Activity Heatmap (Structure untouched per Phase 3.6.1 instruction)
  const heatmap: Array<Array<{ date: string; spending: number; focus: number }>> = [];
  for (let week = 11; week >= 0; week--) {
    const weekData: Array<{ date: string; spending: number; focus: number }> = [];
    for (let day = 0; day < 7; day++) {
      const d = format(subDays(now, week * 7 + (6 - day)), 'yyyy-MM-dd');
      const exp = expenses.filter((e) => e.expense_date === d).reduce((s, e) => s + e.amount, 0);
      const foc = focusSessions.find((s) => s.session_date === d)?.minutes || 0;
      weekData.push({ date: d, spending: exp, focus: foc });
    }
    heatmap.push(weekData);
  }

  // 11. Predictive Forecast
  const dayOfMonth = getDate(now);
  const totalDaysInCurrentMonth = getDaysInMonth(now);
  const dailyBurnRate = dayOfMonth > 0 ? monthlySpent / dayOfMonth : 0;
  const projectedMonthEndSpend = Math.round(dailyBurnRate * totalDaysInCurrentMonth);
  const remainingMonthBudget = baseMonthlyBudget - monthlySpent;
  const daysUntilBudgetExhaustion =
    dailyBurnRate > 0 && remainingMonthBudget > 0
      ? Math.max(1, Math.round(remainingMonthBudget / dailyBurnRate))
      : null;

  const dailyFocusRate = dayOfMonth > 0 ? monthlyFocusMin / dayOfMonth : 0;
  const projectedMonthEndFocusHours = parseFloat(
    ((dailyFocusRate * totalDaysInCurrentMonth) / 60).toFixed(1)
  );

  let budgetHealthStatus: 'healthy' | 'caution' | 'critical' = 'healthy';
  if (baseMonthlyBudget > 0) {
    if (projectedMonthEndSpend > baseMonthlyBudget * 1.1) budgetHealthStatus = 'critical';
    else if (projectedMonthEndSpend > baseMonthlyBudget * 0.9) budgetHealthStatus = 'caution';
  }

  const forecast: ForecastData = {
    projectedMonthEndSpend,
    projectedMonthEndFocusHours,
    daysUntilBudgetExhaustion,
    budgetHealthStatus,
    dailyBurnRate: parseFloat(dailyBurnRate.toFixed(2)),
  };

  return {
    period,
    daysCount,
    hasData,
    totalSpent,
    totalFocusMin,
    totalFocusHours,
    completedTasksCount,
    totalTasksCount,
    taskCompletionRate,
    todayFocusMin,
    weeklyFocusMin,
    monthlyFocusMin,
    todaySessions,
    monthlySessions,
    avgSessionLength,
    longestSessionMins,
    bestFocusDay: { dayName: bestDayName, totalMinutes: bestDayTotal, avgMinutes: bestDayAvg },
    bestFocusHour: { timeWindow: bestHourWindow, sessionCount: bestHourCount },
    currentStreak: profile?.streak || 0,
    longestStreak: Math.max(profile?.streak || 0, 1),
    focusConsistencyRate,
    priorityDistribution,
    weeklyFocusBars,
    todaySpent,
    weeklySpent,
    monthlySpent,
    availableBudget,
    budgetUtilizationPct,
    budgetHealth,
    avgDailySpend,
    topCategory,
    categoryBreakdown,
    largestExpense,
    comparison: {
      focusGrowthPct,
      spendingChangePct,
      tasksGrowthPct,
    },
    productivityScore: prodScoreObj.score,
    productivityScoreLabel: prodScoreObj.label,
    financialScore: finScoreObj.score,
    financialScoreLabel: finScoreObj.label,
    overallWellnessScore,
    overallWellnessLabel,
    focusDollarRatio,
    dailyTimeline,
    scatterData,
    heatmap,
    forecast,
  };
}
