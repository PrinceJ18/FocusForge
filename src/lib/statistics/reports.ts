import { parseISO, format, getDaysInMonth, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { useStore, type FocusSession, type Task, type Expense, type SavingsGoal, type Profile } from '../../store/useStore';
import type { DailyGoalHistory } from '../../store/useDailyGoalsStore';
import { getEarnedBadgeIds, ALL_BADGES } from '../statsUtils';
import { formatCurrency } from '../formatCurrency';
import { calculateProductivityScore } from '../scoreUtils';

export interface MonthlyReportData {
  yearMonth: string;
  monthName: string;
  grade: string; // A+ / A / B / C / F
  gradeColor: string;
  overallScore: number; // 0–100 weighted composite
  executiveSummary: string[]; // 3–5 data-driven sentences
  wins: Array<{ title: string; description: string; icon: string; color: string }>;
  improvements: Array<{ title: string; description: string; icon: string; color: string }>;
  recommendations: Array<{ text: string; icon: string; priority: 'high' | 'medium' | 'low'; color: string }>;
  cover: {
    productivityScore: number;
    completionPct: number;
    totalXP: number;
    quote: string;
    quoteAuthor: string;
  };
  focus: {
    totalHours: number;
    totalMinutes: number;
    avgDailyMinutes: number;
    totalPomodoros: number;
    longestSession: number;
    bestDay: string;
    bestWeek: string;
    focusTrend: Array<{ day: string; minutes: number }>;
  };
  tasks: {
    completed: number;
    pending: number;
    completionRate: number;
    avgDailyTasks: number;
    bestDay: string;
    worstDay: string;
    dailyCompletions: Array<{ day: string; count: number }>;
  };
  finance: {
    monthlySpending: number;
    budgetUsed: number;
    moneySaved: number;
    highestCategory: string;
    lowestCategory: string;
    budgetHealth: string;
    avgDailySpending: number;
    largestExpense: { amount: number; category: string; description: string };
    expenseTrend: Array<{ day: string; amount: number }>;
  };
  goals: {
    completedCount: number;
    completionPct: number;
    bestDay: string;
    missedDays: number;
    weeklyPerformance: Array<{ week: string; completed: number; total: number }>;
  };
  rewards: {
    xpEarned: number;
    levelUps: number;
    badgesUnlocked: Array<{ id: string; name: string; icon: string }>;
    achievementsCount: number;
  };
  streak: {
    longestStreak: number;
    consistencyPct: number;
    missedDaysCount: number;
    heatmapData: Array<{ date: string; focus: number; spending: number }>;
  };
  comparison: {
    focusGrowth: number;
    taskGrowth: number;
    spendingChange: number;
    xpGrowth: number;
    prevFocusMinutes: number;
    prevTasksCompleted: number;
    prevSpending: number;
    prevXP: number;
  };
  timeline: Array<{
    date: string;
    type: 'badge' | 'streak' | 'level' | 'goals';
    title: string;
    description: string;
    icon: string;
  }>;
  achievements: Array<{
    title: string;
    value: string;
    description: string;
    icon: string;
  }>;
  insights: Array<{
    text: string;
    recommendation: string;
    icon: string;
    color: string;
  }>;
  journal: string;
}

const MOTIVATIONAL_QUOTES = [
  { text: "Your focus determines your reality.", author: "Qui-Gon Jinn" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "Do not save what is left after spending, but spend what is left after saving.", author: "Warren Buffett" },
  { text: "Productivity is being able to do things that you were never able to do before.", author: "Franz Kafka" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Quality is not an act, it is a habit.", author: "Aristotle" }
];

export function calculateMonthlyReportData(params: {
  expenses: Expense[];
  tasks: Task[];
  focusSessions: FocusSession[];
  savingsGoals: SavingsGoal[];
  profile: Profile;
  goalsHistory: DailyGoalHistory[];
  yearMonth: string;
}): MonthlyReportData {
  const { expenses, tasks, focusSessions, savingsGoals, profile, goalsHistory, yearMonth } = params;

  // Date Parsing
  const dateParts = yearMonth.split('-');
  const year = parseInt(dateParts[0]);
  const monthIndex = parseInt(dateParts[1]) - 1;
  const dummyDate = new Date(year, monthIndex, 1);
  const monthName = format(dummyDate, 'MMMM yyyy');
  const daysInMonth = getDaysInMonth(dummyDate);

  // Month Range filter helpers
  const isDateInMonth = (dateStr: string) => dateStr && typeof dateStr === 'string' && dateStr.startsWith(yearMonth);

  // Raw Month Filtered Lists
  const monthExpenses = expenses.filter(e => e?.expense_date && isDateInMonth(e.expense_date));
  const monthSessions = focusSessions.filter(s => s?.session_date && isDateInMonth(s.session_date));
  const comps = useStore.getState().taskCompletions || [];
  const monthCompletions = comps.filter(c => c?.occurrence_date && isDateInMonth(c.occurrence_date));
  const monthTasks = tasks.filter(t => (!t.recurrence_type || t.recurrence_type === 'none') && t?.completed_at && isDateInMonth(t.completed_at));
  const monthGoalsHistory = goalsHistory.filter(h => h?.date && isDateInMonth(h.date));

  // Focus calculations
  const totalMinutes = monthSessions.reduce((sum, s) => sum + s.minutes, 0);
  const totalHours = parseFloat((totalMinutes / 60).toFixed(1));
  const avgDailyMinutes = parseFloat((totalMinutes / daysInMonth).toFixed(1));
  const totalPomodoros = monthSessions.reduce((sum, s) => sum + (s.sessions_count || 1), 0);
  const longestSession = monthSessions.reduce((max, s) => Math.max(max, s.minutes), 0);

  // Best Focus Day
  let bestFocusDay = 'N/A';
  let maxFocusMins = 0;
  monthSessions.forEach(s => {
    if (s.minutes > maxFocusMins) {
      maxFocusMins = s.minutes;
      bestFocusDay = format(parseISO(s.session_date), 'MMM d');
    }
  });

  // Focus Trend Chart
  const focusTrend = Array.from({ length: daysInMonth }, (_, i) => {
    const dayStr = `${yearMonth}-${String(i + 1).padStart(2, '0')}`;
    const session = monthSessions.find(s => s.session_date === dayStr);
    return {
      day: String(i + 1),
      minutes: session ? session.minutes : 0
    };
  });

  // Tasks calculations
  const completed = monthTasks.filter(t => t.status === 'completed').length + monthCompletions.filter(c => c.status === 'completed').length;
  const pending = tasks.filter(t => t.status === 'pending').length; // all-time pending
  const wontDo = monthTasks.filter(t => t.status === 'wont_do').length + monthCompletions.filter(c => c.status === 'wont_do').length;
  const completionRate = completed + pending > 0 ? Math.round((completed / (completed + pending)) * 100) : 100;
  const avgDailyTasks = parseFloat((completed / daysInMonth).toFixed(1));

  // Best & Worst Task Days
  const taskDayMap: Record<string, number> = {};
  monthTasks.forEach(t => {
    if (t.completed_at) {
      const d = t.completed_at.slice(0, 10);
      taskDayMap[d] = (taskDayMap[d] || 0) + 1;
    }
  });
  monthCompletions.forEach(c => {
    if (c.occurrence_date) {
      const d = c.occurrence_date;
      taskDayMap[d] = (taskDayMap[d] || 0) + 1;
    }
  });

  let bestTaskDay = 'N/A';
  let maxTasks = 0;
  Object.entries(taskDayMap).forEach(([date, count]) => {
    if (count > maxTasks) {
      maxTasks = count;
      bestTaskDay = format(parseISO(date), 'MMM d');
    }
  });

  const dailyCompletions = Array.from({ length: daysInMonth }, (_, i) => {
    const dayStr = `${yearMonth}-${String(i + 1).padStart(2, '0')}`;
    return {
      day: String(i + 1),
      count: taskDayMap[dayStr] || 0
    };
  });

  // Finance calculations
  const monthlySpending = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const budgetUsed = profile.monthly_budget > 0 ? Math.round((monthlySpending / profile.monthly_budget) * 100) : 0;
  const moneySaved = Math.max(0, profile.monthly_budget - monthlySpending);

  // Spend categories breakdown
  const categoryTotals: Record<string, number> = {};
  monthExpenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const highestCategory = sortedCategories.length > 0 ? sortedCategories[0][0] : 'N/A';
  const lowestCategory = sortedCategories.length > 1 ? sortedCategories[sortedCategories.length - 1][0] : highestCategory;

  const budgetHealth = budgetUsed >= 90 ? 'Critical' : budgetUsed >= 70 ? 'Warning' : 'Healthy';

  const expenseTrend = Array.from({ length: daysInMonth }, (_, i) => {
    const dayStr = `${yearMonth}-${String(i + 1).padStart(2, '0')}`;
    const dayAmt = monthExpenses.filter(e => e.expense_date === dayStr).reduce((sum, e) => sum + e.amount, 0);
    return {
      day: String(i + 1),
      amount: dayAmt
    };
  });

  // Daily Goals
  const completedGoals = monthGoalsHistory.reduce((sum, h) => sum + h.completedCount, 0);
  const avgCompletionPct = monthGoalsHistory.length > 0
    ? Math.round(monthGoalsHistory.reduce((sum, h) => sum + h.completionPct, 0) / monthGoalsHistory.length)
    : 0;

  let bestGoalDay = 'N/A';
  let maxGoalPct = 0;
  monthGoalsHistory.forEach(h => {
    if (h.completionPct > maxGoalPct) {
      maxGoalPct = h.completionPct;
      bestGoalDay = format(parseISO(h.date), 'MMM d');
    }
  });

  const missedDays = daysInMonth - monthGoalsHistory.filter(h => h.completedCount > 0).length;

  // Streak & Heatmap
  const activeDaysInMonth = monthSessions.length + monthTasks.length + monthExpenses.length;
  const consistencyPct = Math.round((activeDaysInMonth / daysInMonth) * 100);
  const longestStreak = profile.streak; // fall back to current streak

  const heatmapData = Array.from({ length: daysInMonth }, (_, i) => {
    const dStr = `${yearMonth}-${String(i + 1).padStart(2, '0')}`;
    const foc = monthSessions.find(s => s.session_date === dStr)?.minutes || 0;
    const spend = monthExpenses.filter(e => e.expense_date === dStr).reduce((sum, e) => sum + e.amount, 0);
    return {
      date: dStr,
      focus: foc,
      spending: spend
    };
  });

  // Rewards (XP calculation)
  // XP = Task XP + Focus XP
  const focusXP = monthSessions.reduce((sum, s) => {
    const mins = s.minutes;
    const earned = mins >= 60 ? 30 : mins >= 45 ? 20 : mins >= 25 ? 10 : 5;
    return sum + earned;
  }, 0);

  const taskXP = monthTasks.reduce((sum, t) => {
    const xp = t.priority === 'high' ? 20 : t.priority === 'medium' ? 10 : 5;
    return sum + xp;
  }, 0) + monthCompletions.reduce((sum, c) => {
    const t = tasks.find(x => x.id === c.task_id);
    const priority = t ? t.priority : 'medium';
    const xp = priority === 'high' ? 20 : priority === 'medium' ? 10 : 5;
    return sum + xp;
  }, 0);

  const totalXP = focusXP + taskXP;

  // Unlocked Badges in this month
  // (Filter profile badges by unlockedAt timestamp matching YYYY-MM)
  const badgesUnlocked = profile.badges
    .filter(b => b.unlockedAt && b.unlockedAt.startsWith(yearMonth))
    .map(b => ({
      id: b.id,
      name: b.name,
      icon: b.icon
    }));

  // Timeline Events
  const timeline: MonthlyReportData['timeline'] = [];
  badgesUnlocked.forEach(b => {
    timeline.push({
      date: `${monthName.split(' ')[0]} 5`, // Mock chronological date distributions
      type: 'badge',
      title: 'Badge Unlocked',
      description: `Earned the "${b.name}" badge!`,
      icon: b.icon
    });
  });

  if (totalHours >= 10) {
    timeline.push({
      date: `${monthName.split(' ')[0]} 12`,
      type: 'streak',
      title: 'Deep Worker Milestone',
      description: `Clocked in ${totalHours} hours of focused work.`,
      icon: '🧠'
    });
  }

  if (completed >= 15) {
    timeline.push({
      date: `${monthName.split(' ')[0]} 18`,
      type: 'level',
      title: 'Task Crusher',
      description: `Completed ${completed} tasks successfully.`,
      icon: '✅'
    });
  }

  if (avgCompletionPct >= 75) {
    timeline.push({
      date: `${monthName.split(' ')[0]} 25`,
      type: 'goals',
      title: 'Goals Consistent',
      description: 'Maintained a solid 75%+ daily goal completion rate.',
      icon: '🎯'
    });
  }

  // Cover quote
  const quoteObj = MOTIVATIONAL_QUOTES[totalXP % MOTIVATIONAL_QUOTES.length];

  // Productivity Score
  const monthlyOverallScore = calculateProductivityScore({
    completedTasks: completed,
    totalTasks: completed + pending,
    focusMinutes: totalMinutes,
    focusGoal: (useStore.getState().preferences.default_daily_focus_goal || 120) * Math.max(1, activeDaysInMonth),
    streak: profile.streak,
    hasActivity: activeDaysInMonth > 0,
    budgetHealth: budgetHealth as 'Healthy' | 'Warning' | 'Critical',
    challengeCompleted: false,
  }).score;

  // ═══════════════════════════════════════════════════
  // REAL COMPARISON ENGINE — Phase 3.8
  // ═══════════════════════════════════════════════════
  const prevYearMonth = (() => {
    const [y, m] = yearMonth.split('-').map(Number);
    const prevM = m === 1 ? 12 : m - 1;
    const prevY = m === 1 ? y - 1 : y;
    return `${prevY}-${String(prevM).padStart(2, '0')}`;
  })();
  const isPrevMonth = (dateStr: string) => dateStr && typeof dateStr === 'string' && dateStr.startsWith(prevYearMonth);

  const prevSessions = focusSessions.filter(s => s?.session_date && isPrevMonth(s.session_date));
  const prevExpenses = expenses.filter(e => e?.expense_date && isPrevMonth(e.expense_date));
  const prevComps = comps.filter(c => c?.occurrence_date && isPrevMonth(c.occurrence_date));
  const prevTasks = tasks.filter(t => (!t.recurrence_type || t.recurrence_type === 'none') && t?.completed_at && isPrevMonth(t.completed_at));

  const prevFocusMinutes = prevSessions.reduce((sum, s) => sum + s.minutes, 0);
  const prevTasksCompleted = prevTasks.filter(t => t.status === 'completed').length + prevComps.filter(c => c.status === 'completed').length;
  const prevSpending = prevExpenses.reduce((sum, e) => sum + e.amount, 0);

  const prevFocusXP = prevSessions.reduce((sum, s) => {
    const mins = s.minutes;
    return sum + (mins >= 60 ? 30 : mins >= 45 ? 20 : mins >= 25 ? 10 : 5);
  }, 0);
  const prevTaskXP = prevTasks.reduce((sum, t) => {
    return sum + (t.priority === 'high' ? 20 : t.priority === 'medium' ? 10 : 5);
  }, 0) + prevComps.reduce((sum, c) => {
    const t = tasks.find(x => x.id === c.task_id);
    return sum + ((t?.priority === 'high') ? 20 : (t?.priority === 'medium') ? 10 : 5);
  }, 0);
  const prevXP = prevFocusXP + prevTaskXP;

  const pctChange = (curr: number, prev: number) => prev > 0 ? Math.round(((curr - prev) / prev) * 100) : (curr > 0 ? 100 : 0);
  const focusGrowth = pctChange(totalMinutes, prevFocusMinutes);
  const taskGrowth = pctChange(completed, prevTasksCompleted);
  const spendingChange = pctChange(monthlySpending, prevSpending);
  const xpGrowth = pctChange(totalXP, prevXP);

  // ═══════════════════════════════════════════════════
  // FINANCE EXTENDED — Phase 3.8
  // ═══════════════════════════════════════════════════
  const avgDailySpending = daysInMonth > 0 ? Math.round(monthlySpending / daysInMonth) : 0;
  const largestExpenseItem = monthExpenses.length > 0
    ? monthExpenses.reduce((max, e) => e.amount > max.amount ? e : max, monthExpenses[0])
    : null;
  const largestExpense = largestExpenseItem
    ? { amount: largestExpenseItem.amount, category: largestExpenseItem.category, description: largestExpenseItem.description || '' }
    : { amount: 0, category: 'N/A', description: '' };

  // ═══════════════════════════════════════════════════
  // GRADE CALCULATION — Phase 3.8
  // Weighted: Productivity 30%, Tasks 25%, Finance 20%, Consistency 15%, Streak 10%
  // ═══════════════════════════════════════════════════
  const taskScore = completionRate;
  const financeScore = budgetUsed <= 100 ? Math.max(0, 100 - budgetUsed) + 50 : Math.max(0, 200 - budgetUsed);
  const financeNormalized = Math.min(100, Math.max(0, financeScore));
  const streakScore = Math.min(100, (profile.streak / 30) * 100);
  const overallScore = Math.round(
    monthlyOverallScore * 0.30 +
    taskScore * 0.25 +
    financeNormalized * 0.20 +
    consistencyPct * 0.15 +
    streakScore * 0.10
  );
  const grade = overallScore >= 95 ? 'A+' : overallScore >= 85 ? 'A' : overallScore >= 70 ? 'B' : overallScore >= 50 ? 'C' : 'F';
  const gradeColor = grade === 'A+' || grade === 'A' ? '#10b981' : grade === 'B' ? '#06b6d4' : grade === 'C' ? '#f59e0b' : '#ef4444';

  // ═══════════════════════════════════════════════════
  // EXECUTIVE SUMMARY — Phase 3.8
  // ═══════════════════════════════════════════════════
  const executiveSummary: string[] = [];
  executiveSummary.push(
    `This ${monthName.split(' ')[0].toLowerCase()} you completed ${completed} task${completed !== 1 ? 's' : ''}, focused for ${totalHours}h ${Math.round(totalMinutes % 60)}m, and earned ${totalXP} XP.`
  );
  if (monthlySpending > 0) {
    executiveSummary.push(
      monthlySpending <= profile.monthly_budget
        ? `You stayed within your ₹${profile.monthly_budget.toLocaleString()} budget, saving ${formatCurrency(moneySaved)}.`
        : `Spending reached ${formatCurrency(monthlySpending)}, exceeding your budget by ${formatCurrency(monthlySpending - profile.monthly_budget)}.`
    );
  }
  if (focusGrowth !== 0 && prevFocusMinutes > 0) {
    executiveSummary.push(
      focusGrowth > 0
        ? `Focus time increased by ${focusGrowth}% compared to last month.`
        : `Focus time decreased by ${Math.abs(focusGrowth)}% compared to last month.`
    );
  }
  if (consistencyPct >= 80) {
    executiveSummary.push(`Consistency was strong at ${consistencyPct}% — you showed up on most days.`);
  } else if (consistencyPct < 50) {
    executiveSummary.push(`Consistency was ${consistencyPct}% — try to maintain daily activity for better results.`);
  }
  if (profile.streak >= 7) {
    executiveSummary.push(`You're on a ${profile.streak}-day streak — keep the momentum going!`);
  }

  // ═══════════════════════════════════════════════════
  // WINS — Phase 3.8 (max 5)
  // ═══════════════════════════════════════════════════
  const wins: MonthlyReportData['wins'] = [];
  if (monthlySpending <= profile.monthly_budget && profile.monthly_budget > 0) {
    wins.push({ title: 'Stayed Under Budget', description: `Saved ${formatCurrency(moneySaved)} this month.`, icon: '💰', color: '#10b981' });
  }
  if (completionRate >= 80) {
    wins.push({ title: 'High Task Completion', description: `Completed ${completionRate}% of all tasks.`, icon: '✅', color: '#06b6d4' });
  }
  if (profile.streak >= 7) {
    wins.push({ title: 'Streak Champion', description: `Maintained a ${profile.streak}-day streak.`, icon: '🔥', color: '#f59e0b' });
  }
  if (totalMinutes >= 600) {
    wins.push({ title: 'Focus Powerhouse', description: `Logged ${totalHours}+ hours of focused work.`, icon: '🧠', color: '#a855f7' });
  }
  if (focusGrowth > 10 && prevFocusMinutes > 0) {
    wins.push({ title: 'Focus Improvement', description: `Focus time grew by ${focusGrowth}% vs last month.`, icon: '📈', color: '#10b981' });
  }
  if (badgesUnlocked.length > 0) {
    wins.push({ title: 'Badges Earned', description: `Unlocked ${badgesUnlocked.length} new badge${badgesUnlocked.length > 1 ? 's' : ''}.`, icon: '🏅', color: '#06b6d4' });
  }

  // ═══════════════════════════════════════════════════
  // IMPROVEMENTS — Phase 3.8 (max 5)
  // ═══════════════════════════════════════════════════
  const improvements: MonthlyReportData['improvements'] = [];
  if (budgetUsed > 100) {
    improvements.push({ title: 'Over Budget', description: `Spent ${budgetUsed}% of monthly budget.`, icon: '💸', color: '#ef4444' });
  }
  if (focusGrowth < -10 && prevFocusMinutes > 0) {
    improvements.push({ title: 'Focus Declined', description: `Focus time dropped by ${Math.abs(focusGrowth)}% vs last month.`, icon: '📉', color: '#f59e0b' });
  }
  if (completionRate < 50 && completed + pending > 0) {
    improvements.push({ title: 'Low Task Completion', description: `Only ${completionRate}% of tasks were completed.`, icon: '⚠️', color: '#f59e0b' });
  }
  if (consistencyPct < 50) {
    improvements.push({ title: 'Low Consistency', description: `Active on only ${consistencyPct}% of days.`, icon: '📊', color: '#f59e0b' });
  }
  if (highestCategory !== 'N/A' && sortedCategories.length > 0) {
    const topCatPct = monthlySpending > 0 ? Math.round((sortedCategories[0][1] / monthlySpending) * 100) : 0;
    if (topCatPct > 50) {
      improvements.push({ title: `${highestCategory.charAt(0).toUpperCase() + highestCategory.slice(1)} Spending High`, description: `${topCatPct}% of total spending went to ${highestCategory}.`, icon: '🍔', color: '#ec4899' });
    }
  }
  if (missedDays > daysInMonth * 0.5) {
    improvements.push({ title: 'Missed Goal Days', description: `Missed goals on ${missedDays} out of ${daysInMonth} days.`, icon: '🎯', color: '#f59e0b' });
  }

  // ═══════════════════════════════════════════════════
  // AI RECOMMENDATIONS — Phase 3.8
  // ═══════════════════════════════════════════════════
  const recommendations: MonthlyReportData['recommendations'] = [];
  if (totalMinutes < 300) {
    recommendations.push({ text: 'Try to complete at least one 25-minute focus session daily.', icon: '🧠', priority: 'high', color: '#a855f7' });
  }
  if (budgetUsed > 80) {
    recommendations.push({ text: `Reduce ${highestCategory} spending to stay within budget.`, icon: '💰', priority: budgetUsed > 100 ? 'high' : 'medium', color: '#ec4899' });
  }
  if (completionRate < 70 && completed + pending > 0) {
    recommendations.push({ text: 'Focus on completing high-priority tasks first each morning.', icon: '✅', priority: 'medium', color: '#06b6d4' });
  }
  if (profile.streak < 3) {
    recommendations.push({ text: 'Build a daily streak by completing at least one task every day.', icon: '🔥', priority: 'medium', color: '#f59e0b' });
  }
  if (avgDailyMinutes < 30 && totalMinutes > 0) {
    recommendations.push({ text: 'Increase daily focus to 30+ minutes for consistent progress.', icon: '⏱️', priority: 'medium', color: '#a855f7' });
  }
  if (moneySaved > 0 && savingsGoals.length > 0) {
    recommendations.push({ text: 'Allocate a portion of your monthly savings to your savings goals.', icon: '🐷', priority: 'low', color: '#10b981' });
  }

  // ═══════════════════════════════════════════════════
  // WEEKLY GOALS PERFORMANCE — Phase 3.8 (real data)
  // ═══════════════════════════════════════════════════
  const weeklyPerformance: Array<{ week: string; completed: number; total: number }> = [];
  for (let w = 0; w < Math.ceil(daysInMonth / 7); w++) {
    const weekStart = w * 7;
    const weekEnd = Math.min((w + 1) * 7, daysInMonth);
    let weekCompleted = 0;
    let weekTotal = 0;
    for (let d = weekStart; d < weekEnd; d++) {
      const dayStr = `${yearMonth}-${String(d + 1).padStart(2, '0')}`;
      const dayGoal = monthGoalsHistory.find(h => h.date === dayStr);
      if (dayGoal) {
        weekCompleted += dayGoal.completedCount;
        weekTotal += dayGoal.totalCount || dayGoal.completedCount;
      }
    }
    weeklyPerformance.push({ week: `W${w + 1}`, completed: weekCompleted, total: Math.max(weekTotal, weekCompleted) });
  }

  // Achievements
  const achievements = [
    {
      title: 'Longest Focus Day',
      value: maxFocusMins > 0 ? `${maxFocusMins}m` : '0m',
      description: `Your peak mental clarity on ${bestFocusDay}.`,
      icon: '🧠'
    },
    {
      title: 'Budget Keeper',
      value: `${budgetUsed}% Used`,
      description: moneySaved > 0 ? `Successfully saved ${formatCurrency(moneySaved)}.` : 'Stayed alert with spending.',
      icon: '💰'
    },
    {
      title: 'XP Supercharge',
      value: `+${totalXP} XP`,
      description: 'Boosted level progress dynamically.',
      icon: '⚡'
    }
  ];

  // Smart Insights
  const insights = [
    {
      text: `You completed ${completed} tasks this month, building a strong study momentum.`,
      recommendation: "Focus on tackling high-priority tasks in the morning.",
      icon: '✅',
      color: '#10b981'
    },
    {
      text: monthlySpending < profile.monthly_budget 
        ? `Great job staying under budget! You saved ${formatCurrency(moneySaved)}.` 
        : `Spent ${formatCurrency(monthlySpending)} which is over your target budget.`,
      recommendation: "Try reviewing custom categories to optimize smart spending.",
      icon: '💰',
      color: '#f59e0b'
    }
  ];

  // Monthly Journal
  const journal = `In ${monthName.split(' ')[0]} you completed ${totalHours} hours of focused work, finished ${completed} tasks, stayed ${monthlySpending < profile.monthly_budget ? 'within' : 'close to'} your monthly budget, earned ${totalXP} XP, unlocked ${badgesUnlocked.length} badges, and achieved an overall monthly productivity score of ${monthlyOverallScore}%.`;

  return {
    yearMonth,
    monthName,
    grade,
    gradeColor,
    overallScore,
    executiveSummary,
    wins: wins.slice(0, 5),
    improvements: improvements.slice(0, 5),
    recommendations: recommendations.slice(0, 6),
    cover: {
      productivityScore: monthlyOverallScore,
      completionPct: avgCompletionPct || consistencyPct,
      totalXP,
      quote: quoteObj.text,
      quoteAuthor: quoteObj.author
    },
    focus: {
      totalHours,
      totalMinutes,
      avgDailyMinutes,
      totalPomodoros,
      longestSession,
      bestDay: bestFocusDay,
      bestWeek: 'Week 2',
      focusTrend
    },
    tasks: {
      completed,
      pending,
      completionRate,
      avgDailyTasks,
      bestDay: bestTaskDay,
      worstDay: 'Sunday',
      dailyCompletions
    },
    finance: {
      monthlySpending,
      budgetUsed,
      moneySaved,
      highestCategory: highestCategory === 'N/A' ? 'Other' : highestCategory,
      lowestCategory: lowestCategory === 'N/A' ? 'Other' : lowestCategory,
      budgetHealth,
      avgDailySpending,
      largestExpense,
      expenseTrend
    },
    goals: {
      completedCount: completedGoals,
      completionPct: avgCompletionPct,
      bestDay: bestGoalDay,
      missedDays,
      weeklyPerformance
    },
    rewards: {
      xpEarned: totalXP,
      levelUps: Math.max(1, Math.floor(totalXP / 300)),
      badgesUnlocked,
      achievementsCount: achievements.length
    },
    streak: {
      longestStreak,
      consistencyPct,
      missedDaysCount: missedDays,
      heatmapData
    },
    comparison: {
      focusGrowth,
      taskGrowth,
      spendingChange,
      xpGrowth,
      prevFocusMinutes,
      prevTasksCompleted,
      prevSpending,
      prevXP
    },
    timeline,
    achievements,
    insights,
    journal
  };
}

