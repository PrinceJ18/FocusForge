/**
 * Coach Engine — Early Risk Detection (Phase 3.9.5 Task 3)
 *
 * Evaluates predictive vulnerability indicators across 5 critical risk dimensions:
 * 1. Streak Loss Risk (time remaining today, historical activity window)
 * 2. Budget Exhaustion Risk (days until depletion, spending acceleration velocity)
 * 3. Burnout Risk (excessive consecutive high-intensity days, late-night strain)
 * 4. Overdue Task Risk (backlog aging, tasks due within 24h)
 * 5. Savings Goal Risk (funding pace vs deadline shortfall)
 *
 * Provides actionable mitigation advice and generates top critical risk alerts.
 *
 * @module coach/coachRisks
 */

import { parseISO, getHours, getDaysInMonth, getDate, differenceInDays } from 'date-fns';
import type {
  CoachInput,
  CoachEarlyRiskReport,
  StreakLossRisk,
  BudgetExhaustionRisk,
  BurnoutRisk,
  OverdueTaskRisk,
  SavingsGoalRisk,
  CoachRiskItem,
} from './coachTypes';
import { clamp, safePercent, calculateSpendingVelocity, getTodayDateString } from './coachUtils';

/**
 * Evaluates the risk of current streak breaking today.
 */
export function evaluateStreakLossRisk(input: CoachInput): StreakLossRisk {
  const { profile, analytics, tasks } = input;
  const now = new Date();
  const currentHour = now.getHours();
  const hoursRemaining = Math.max(0, 24 - currentHour);
  const todayStr = getTodayDateString(now);

  const todayCompletedTasks = tasks.filter(
    t => t.status === 'completed' && t.completed_at && t.completed_at.startsWith(todayStr)
  ).length;
  const todayFocus = analytics.todayFocusMin;

  const hasActivityToday = todayCompletedTasks > 0 || todayFocus > 0;

  if (profile.streak === 0) {
    return {
      riskScore: 0,
      isImminent: false,
      hoursRemainingToday: hoursRemaining,
      probability: 'none',
      advice: 'No active streak currently. Start a 25m focus session or finish 1 task to start a new streak!',
    };
  }

  if (hasActivityToday) {
    return {
      riskScore: 0,
      isImminent: false,
      hoursRemainingToday: hoursRemaining,
      probability: 'none',
      advice: `Your ${profile.streak}-day streak is secured for today! Excellent consistency.`,
    };
  }

  // Activity has not occurred yet today
  let riskScore = 20; // Baseline reminder
  let probability: StreakLossRisk['probability'] = 'low';

  if (hoursRemaining <= 4) {
    riskScore = 95;
    probability = 'critical';
  } else if (hoursRemaining <= 8) {
    riskScore = 75;
    probability = 'high';
  } else if (hoursRemaining <= 14) {
    riskScore = 45;
    probability = 'medium';
  }

  // Weight by streak value (higher streak = higher urgency to protect)
  if (profile.streak >= 7 && probability !== 'critical') {
    riskScore = Math.min(100, riskScore + 15);
  }

  const advice =
    hoursRemaining <= 4
      ? `CRITICAL: Only ${hoursRemaining} hours left today! Complete 1 quick task or a 10m timer to protect your ${profile.streak}-day streak.`
      : `Log at least one task or focus session before midnight to keep your ${profile.streak}-day streak alive.`;

  return {
    riskScore,
    isImminent: hoursRemaining <= 6,
    hoursRemainingToday: hoursRemaining,
    probability,
    advice,
  };
}

/**
 * Evaluates budget depletion trajectory and exhaustion risk.
 */
export function evaluateBudgetExhaustionRisk(input: CoachInput): BudgetExhaustionRisk {
  const { profile, analytics, dailyGoalHistory } = input;
  const budget = profile.monthly_budget;

  if (budget <= 0) {
    return {
      riskScore: 0,
      daysUntilExhaustion: null,
      projectedDeficit: 0,
      velocity: 'stable',
      probability: 'none',
      advice: 'No monthly budget target configured. Set a budget in Settings to activate spending alerts.',
    };
  }

  const now = new Date();
  const dayOfMonth = getDate(now);
  const totalDays = getDaysInMonth(now);
  const daysLeftInMonth = Math.max(1, totalDays - dayOfMonth + 1);

  const spentSoFar = analytics.monthlySpent;
  const remainingBudget = budget - spentSoFar;

  const dailyExpenses = dailyGoalHistory.map(h => h.totalSpent);
  const { velocity, factor } = calculateSpendingVelocity(dailyExpenses);

  const currentDailyBurn = analytics.avgDailySpend || (dayOfMonth > 0 ? spentSoFar / dayOfMonth : 0);
  const effectiveBurnRate = currentDailyBurn * (velocity === 'accelerating' ? 1.2 : velocity === 'decelerating' ? 0.85 : 1.0);

  const projectedTotal = spentSoFar + effectiveBurnRate * daysLeftInMonth;
  const projectedDeficit = Math.max(0, Math.round(projectedTotal - budget));

  const daysUntilExhaustion =
    remainingBudget > 0 && effectiveBurnRate > 0
      ? Math.max(1, Math.floor(remainingBudget / effectiveBurnRate))
      : remainingBudget <= 0
        ? 0
        : null;

  let riskScore = 0;
  let probability: BudgetExhaustionRisk['probability'] = 'none';

  const utilizationPct = safePercent(spentSoFar, budget);

  if (remainingBudget <= 0) {
    riskScore = 100;
    probability = 'critical';
  } else if (daysUntilExhaustion !== null && daysUntilExhaustion < daysLeftInMonth) {
    const gap = daysLeftInMonth - daysUntilExhaustion;
    riskScore = clamp(60 + gap * 3 + (velocity === 'accelerating' ? 15 : 0), 60, 95);
    probability = riskScore >= 80 ? 'critical' : 'high';
  } else if (utilizationPct > 80) {
    riskScore = 50;
    probability = 'medium';
  } else if (utilizationPct > 60) {
    riskScore = 25;
    probability = 'low';
  }

  const safeDailyAllowance = Math.max(0, Math.round(remainingBudget / daysLeftInMonth));
  const advice =
    probability === 'critical'
      ? `Budget is exhausted or on track to run out in ${daysUntilExhaustion ?? 0} days (projected ₹${projectedDeficit} overspend). Cap non-essential spending immediately.`
      : probability === 'high'
        ? `Spending velocity is ${velocity}. Target daily limit: ₹${safeDailyAllowance}/day for the remaining ${daysLeftInMonth} days.`
        : `Budget is well tracked at ${utilizationPct}% utilization. Safe daily limit is ₹${safeDailyAllowance}.`;

  return {
    riskScore,
    daysUntilExhaustion,
    projectedDeficit,
    velocity,
    probability,
    advice,
  };
}

/**
 * Evaluates burnout risk based on sustained high focus volume and late night sessions.
 */
export function evaluateBurnoutRisk(input: CoachInput): BurnoutRisk {
  const { dailyGoalHistory, events, analytics } = input;

  // 1. Consecutive days with >= 300 minutes (5 hours) of intense focus
  let consecutiveIntenseDays = 0;
  for (let i = dailyGoalHistory.length - 1; i >= 0; i--) {
    if (dailyGoalHistory[i].focusMinutes >= 300) {
      consecutiveIntenseDays += 1;
    } else {
      break;
    }
  }

  // 2. Late night focus sessions (between 23:00 and 05:00)
  let lateNightCount = 0;
  const recentEvents = events.slice(0, 50);
  recentEvents.forEach(evt => {
    if (evt.type === 'pomodoro_completed' || evt.category === 'focus') {
      try {
        const hour = getHours(parseISO(evt.timestamp));
        if (hour >= 23 || hour <= 4) {
          lateNightCount += 1;
        }
      } catch {
        // Skip
      }
    }
  });

  let riskScore = 10;
  let level: BurnoutRisk['level'] = 'low';

  if (consecutiveIntenseDays >= 4 || lateNightCount >= 5) {
    riskScore = 85;
    level = 'critical';
  } else if (consecutiveIntenseDays >= 2 || lateNightCount >= 3) {
    riskScore = 60;
    level = 'high';
  } else if (consecutiveIntenseDays >= 1 || lateNightCount >= 1) {
    riskScore = 35;
    level = 'moderate';
  }

  const advice =
    level === 'critical'
      ? `High burnout strain detected (${consecutiveIntenseDays} consecutive marathon focus days, ${lateNightCount} late-night sessions). Take a scheduled recovery day.`
      : level === 'high'
        ? 'Noticeable cognitive load buildup. Prioritize 15-minute breaks between sessions and protect sleep hours.'
        : 'Work-rest balance is currently within healthy operational boundaries.';

  return {
    riskScore,
    consecutiveHighFocusDays: consecutiveIntenseDays,
    lateNightSessionCount: lateNightCount,
    level,
    advice,
  };
}

/**
 * Evaluates pending task backlog risk and deadline pressure.
 */
export function evaluateOverdueTaskRisk(input: CoachInput): OverdueTaskRisk {
  const { tasks } = input;
  const now = new Date();
  const nowMs = now.getTime();
  const todayStr = getTodayDateString(now);

  let overdueCount = 0;
  let imminentCount = 0; // Due within 24 hours
  let highPriorityAtRisk = 0;

  tasks.forEach(t => {
    if (t.status === 'pending' && t.deadline) {
      try {
        const deadlineDate = parseISO(t.deadline);
        const diffHours = (deadlineDate.getTime() - nowMs) / (1000 * 60 * 60);

        if (t.deadline < todayStr || diffHours < 0) {
          overdueCount += 1;
          if (t.priority === 'high') highPriorityAtRisk += 1;
        } else if (diffHours <= 24) {
          imminentCount += 1;
          if (t.priority === 'high') highPriorityAtRisk += 1;
        }
      } catch {
        // Skip
      }
    }
  });

  const riskScore = clamp(
    Math.round(overdueCount * 12 + imminentCount * 8 + highPriorityAtRisk * 15),
    0,
    100
  );

  const advice =
    overdueCount > 3 || highPriorityAtRisk > 2
      ? `You have ${overdueCount} overdue tasks (${highPriorityAtRisk} high-priority). Batch triage or reschedule non-critical tasks.`
      : imminentCount > 0
        ? `${imminentCount} tasks are due within the next 24 hours. Tackle the highest impact task first.`
        : 'Task backlog is clean and deadlines are well maintained.';

  return {
    riskScore,
    overdueCount,
    imminentCount,
    highPriorityAtRiskCount: highPriorityAtRisk,
    advice,
  };
}

/**
 * Evaluates savings goals risk (funding pace vs deadline).
 */
export function evaluateSavingsGoalRisk(input: CoachInput): SavingsGoalRisk {
  const { savingsGoals } = input;
  const now = new Date();

  if (savingsGoals.length === 0) {
    return {
      riskScore: 0,
      atRiskGoalsCount: 0,
      totalShortfall: 0,
      advice: 'No savings goals configured.',
    };
  }

  let atRiskCount = 0;
  let totalShortfall = 0;

  savingsGoals.forEach(g => {
    const remainingAmount = Math.max(0, g.target_amount - g.current_amount);
    if (remainingAmount > 0 && g.deadline) {
      try {
        const deadlineDate = parseISO(g.deadline);
        const daysRemaining = differenceInDays(deadlineDate, now);

        if (daysRemaining <= 30 && g.current_amount < g.target_amount * 0.5) {
          atRiskCount += 1;
          totalShortfall += remainingAmount;
        } else if (daysRemaining <= 0) {
          atRiskCount += 1;
          totalShortfall += remainingAmount;
        }
      } catch {
        // Skip
      }
    }
  });

  const riskScore = atRiskCount > 0 ? clamp(Math.round(atRiskCount * 25 + (totalShortfall > 5000 ? 25 : 10)), 20, 90) : 0;

  const advice =
    atRiskCount > 0
      ? `${atRiskCount} savings goal(s) are falling behind scheduled pace (₹${totalShortfall} shortfall). Consider increasing monthly allocation.`
      : 'Savings goal contributions are tracking according to schedule.';

  return {
    riskScore,
    atRiskGoalsCount: atRiskCount,
    totalShortfall,
    advice,
  };
}

/**
 * Main Early Risk Report Generator.
 */
export function generateCoachEarlyRiskReport(input: CoachInput): CoachEarlyRiskReport {
  const streakLossRisk = evaluateStreakLossRisk(input);
  const budgetExhaustionRisk = evaluateBudgetExhaustionRisk(input);
  const burnoutRisk = evaluateBurnoutRisk(input);
  const overdueTaskRisk = evaluateOverdueTaskRisk(input);
  const savingsGoalRisk = evaluateSavingsGoalRisk(input);

  // Synthesize top critical risk items
  const topCriticalRisks: CoachRiskItem[] = [];

  if (streakLossRisk.probability === 'critical' || streakLossRisk.probability === 'high') {
    topCriticalRisks.push({
      id: 'risk_streak_loss_early',
      title: 'Streak at Imminent Risk',
      description: streakLossRisk.advice,
      severity: streakLossRisk.probability === 'critical' ? 'critical' : 'high',
      category: 'streak',
      icon: '🔥',
      color: '#ef4444',
      threshold: {
        label: 'Hours Remaining Today',
        actual: streakLossRisk.hoursRemainingToday,
        limit: 24,
        unit: 'hrs',
      },
      suggestedAction: 'Start a quick 10m timer or complete 1 task now.',
      probability: streakLossRisk.probability === 'critical' ? 'high' : 'medium',
    });
  }

  if (budgetExhaustionRisk.probability === 'critical' || budgetExhaustionRisk.probability === 'high') {
    topCriticalRisks.push({
      id: 'risk_budget_exhaustion_early',
      title: 'Budget Depletion Warning',
      description: budgetExhaustionRisk.advice,
      severity: budgetExhaustionRisk.probability === 'critical' ? 'critical' : 'high',
      category: 'finance',
      icon: '💸',
      color: '#ef4444',
      threshold: {
        label: 'Days of Budget Remaining',
        actual: budgetExhaustionRisk.daysUntilExhaustion ?? 0,
        limit: 30,
        unit: 'days',
      },
      suggestedAction: 'Pause discretionary purchases for 48 hours.',
      probability: budgetExhaustionRisk.probability === 'critical' ? 'high' : 'medium',
    });
  }

  if (burnoutRisk.level === 'critical' || burnoutRisk.level === 'high') {
    topCriticalRisks.push({
      id: 'risk_burnout_detected',
      title: 'Cognitive Fatigue Risk',
      description: burnoutRisk.advice,
      severity: burnoutRisk.level === 'critical' ? 'high' : 'medium',
      category: 'wellness',
      icon: '🧘',
      color: '#f59e0b',
      threshold: {
        label: 'Consecutive Intense Days',
        actual: burnoutRisk.consecutiveHighFocusDays,
        limit: 3,
        unit: 'days',
      },
      suggestedAction: 'Take a scheduled 30m break and step away from screens.',
      probability: burnoutRisk.level === 'critical' ? 'high' : 'medium',
    });
  }

  if (overdueTaskRisk.overdueCount >= 3) {
    topCriticalRisks.push({
      id: 'risk_task_overdue_backlog',
      title: 'Backlog Stagnation',
      description: overdueTaskRisk.advice,
      severity: 'high',
      category: 'tasks',
      icon: '⚠️',
      color: '#ef4444',
      threshold: {
        label: 'Overdue Tasks',
        actual: overdueTaskRisk.overdueCount,
        limit: 2,
        unit: 'tasks',
      },
      suggestedAction: 'Reschedule or cancel 3 low-priority overdue tasks.',
      probability: 'high',
    });
  }

  // Calculate overall risk level
  const maxScore = Math.max(
    streakLossRisk.riskScore,
    budgetExhaustionRisk.riskScore,
    burnoutRisk.riskScore,
    overdueTaskRisk.riskScore,
    savingsGoalRisk.riskScore
  );

  let overallRiskLevel: CoachEarlyRiskReport['overallRiskLevel'] = 'minimal';
  if (maxScore >= 80) overallRiskLevel = 'critical';
  else if (maxScore >= 60) overallRiskLevel = 'high';
  else if (maxScore >= 35) overallRiskLevel = 'medium';
  else if (maxScore >= 15) overallRiskLevel = 'low';

  return {
    overallRiskLevel,
    streakLossRisk,
    budgetExhaustionRisk,
    burnoutRisk,
    overdueTaskRisk,
    savingsGoalRisk,
    topCriticalRisks,
  };
}
