/**
 * Coach Engine — Main Orchestrator (Phase 3.9.6 Infrastructure Enhanced)
 *
 * Provides the `createCoachEngine()` factory function that accepts CoachInput
 * and returns an object with all generation methods backed by:
 * - In-memory Repository (coachRepository.ts)
 * - Snapshot History (coachHistory.ts)
 * - Cache Layer (coachCache.ts)
 * - Computation Scheduler (coachScheduler.ts)
 * - Profiler & Metrics (coachProfiler.ts, coachMetrics.ts)
 * - Structural Validator (coachValidator.ts)
 * - Centralized Constants (coachConstants.ts)
 *
 * Preserves 100% backward compatibility with existing method contracts.
 * No React. No JSX. No UI. No store access. No side effects.
 *
 * @module coach/coachEngine
 */

import type {
  CoachInput,
  DailyBrief,
  EveningReview,
  WeeklyReview,
  MonthlyReview,
  CoachRecommendation,
  CoachPredictions,
  CoachRiskItem,
  AchievementsSummary,
  CoachTrendItem,
  CoachHabitAnalysis,
  CoachBehaviourTrends,
  CoachEarlyRiskReport,
  CoachTimelineEvent,
  CoachOutput,
} from './coachTypes';
import { evaluateAllRules } from './coachRules';
import { generateCoachHabitAnalysis } from './coachHabits';
import { generateCoachBehaviourTrends } from './coachTrends';
import { generateCoachEarlyRiskReport } from './coachRisks';
import { generateCoachTimeline } from './coachTimeline';
import {
  detectTrend,
  weightedMovingAverage,
  linearExtrapolate,
  enhancedPredictMonthlyValue,
  calculateSpendingVelocity,
  calculateFocusMomentum,
  clamp,
  safePercent,
  gradeFromScore,
  calculateStreakRisk,
  getCurrentDayOfMonth,
  getCurrentMonthDays,
  getTodayDateString,
  getPredictionConfidence,
  extractDailyFocusFromHistory,
  extractDailySpendingFromHistory,
  extractDailyTasksFromHistory,
  extractDailyProgressFromHistory,
} from './coachUtils';
import { COACH_INFRASTRUCTURE, RANKING_WEIGHTS, RULE_THRESHOLDS } from './coachConstants';
import { coachCache } from './coachCache';
import { coachScheduler, generateContextHash } from './coachScheduler';
import { coachHistory } from './coachHistory';
import { coachRepository } from './coachRepository';
import { coachMetrics } from './coachMetrics';
import { coachProfiler } from './coachProfiler';
import { validateCoachOutput } from './coachValidator';
import { format, getWeek, getYear } from 'date-fns';

// ═══════════════════════════════════════════════════════════════
// Engine Interface
// ═══════════════════════════════════════════════════════════════

/**
 * Public interface returned by createCoachEngine().
 * Each method generates a specific coaching output.
 */
export interface CoachEngine {
  /** Morning brief with greeting, priorities, risks, streak status, prime focus window */
  generateDailyBrief: () => DailyBrief;
  /** Evening review with accomplishments, missed targets, day score */
  generateEveningReview: () => EveningReview;
  /** Weekly review with wins, improvements, trends, grade */
  generateWeeklyReview: () => WeeklyReview;
  /** Monthly review enriched by coach insights */
  generateMonthlyReview: () => MonthlyReview;
  /** All ranked recommendations with explainability */
  generateRecommendations: () => readonly CoachRecommendation[];
  /** Projected values for current period with enhanced predictive math */
  generatePredictions: () => CoachPredictions;
  /** Critical and high severity risk items */
  generateRiskAssessment: () => readonly CoachRiskItem[];
  /** Recent achievements and approaching milestones */
  generateAchievementsSummary: () => AchievementsSummary;
  /** Habit detection: peak weekdays, focus hours, weekend dynamics, procrastination patterns */
  generateHabitAnalysis: () => CoachHabitAnalysis;
  /** 5-Facet Behaviour Trend Analysis with momentum scoring */
  generateBehaviourTrends: () => CoachBehaviourTrends;
  /** Early risk report evaluating streak, burnout, budget, tasks, and savings */
  generateEarlyRisks: () => CoachEarlyRiskReport;
  /** Chronological coach timeline events */
  generateTimeline: () => readonly CoachTimelineEvent[];
  /** Generates or retrieves the complete unified CoachOutput */
  generateCompleteOutput: () => CoachOutput;
}

// ═══════════════════════════════════════════════════════════════
// Internal Helpers
// ═══════════════════════════════════════════════════════════════

function getGreeting(displayName: string): string {
  const hour = new Date().getHours();
  const name = displayName || 'there';
  if (hour < 12) return `Good morning, ${name}!`;
  if (hour < 17) return `Good afternoon, ${name}!`;
  return `Good evening, ${name}!`;
}

function getMotivation(score: number, streak: number, focusGrowthPct: number): string {
  if (score >= 85 && streak >= 7) {
    return "You're in the zone — elite-level consistency and performance. Keep pushing!";
  }
  if (score >= 70) {
    return 'Solid performance! Small improvements compound into major results over time.';
  }
  if (focusGrowthPct > 15) {
    return 'Your focus is trending upward — momentum is building. Capitalize on it today!';
  }
  if (streak >= 3) {
    return `${streak}-day streak and counting! Every day you show up, you get stronger.`;
  }
  if (score >= 40) {
    return 'Progress is progress, no matter the pace. One focused session can shift your entire day.';
  }
  return 'Start small, start now. Even 25 minutes of focused work creates momentum.';
}

function buildTrendItem(
  metric: string,
  direction: 'improving' | 'declining' | 'stable',
  magnitudePct: number,
  category: CoachTrendItem['category']
): CoachTrendItem {
  const dirLabel = direction === 'improving' ? 'up' : direction === 'declining' ? 'down' : 'stable';
  const icon = direction === 'improving' ? '📈' : direction === 'declining' ? '📉' : '➡️';
  const color = direction === 'improving' ? '#10b981' : direction === 'declining' ? '#f59e0b' : '#6b7280';

  return {
    metric,
    direction,
    magnitudePct,
    summary: magnitudePct > 0
      ? `${metric} is ${dirLabel} by ${magnitudePct}% compared to the previous period.`
      : `${metric} has remained stable.`,
    category,
    icon,
    color,
  };
}

// ═══════════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════════

/**
 * Creates a new Coach Engine instance with full infrastructure integration.
 *
 * @param input - Complete coach input data
 * @returns CoachEngine instance with 13 generation methods
 */
export function createCoachEngine(input: CoachInput): CoachEngine {
  const { analytics, profile, preferences, dailyGoalHistory } = input;
  const contextHash = generateContextHash(input);

  // Cached execution helper using coachCache & coachProfiler
  function cachedCompute<T>(namespace: string, computeFn: () => T, ttlMs = COACH_INFRASTRUCTURE.DEFAULT_CACHE_TTL_MS): T {
    const key = coachCache.generateKey(namespace, contextHash);
    const cached = coachCache.get<T>(key);
    if (cached !== null) {
      coachMetrics.recordCacheHit();
      return cached;
    }

    coachMetrics.recordCacheMiss();
    const start = performance.now();
    const result = coachProfiler.profileMethod(namespace, computeFn);
    const duration = performance.now() - start;

    coachCache.set(key, result, ttlMs);
    coachMetrics.recordExecution(duration);
    return result;
  }

  // ─── Individual Core Computations ────────────────────────
  const getRecommendations = (): readonly CoachRecommendation[] =>
    cachedCompute('recommendations', () => evaluateAllRules(input));

  const getHabits = (): CoachHabitAnalysis =>
    cachedCompute('habits', () => generateCoachHabitAnalysis(input));

  const getTrends = (): CoachBehaviourTrends =>
    cachedCompute('trends', () => generateCoachBehaviourTrends(input));

  const getEarlyRisks = (): CoachEarlyRiskReport =>
    cachedCompute('early_risks', () => generateCoachEarlyRiskReport(input));

  const getTimeline = (): readonly CoachTimelineEvent[] =>
    cachedCompute('timeline', () => generateCoachTimeline(input, getHabits(), getTrends(), getEarlyRisks()));

  const getPredictions = (): CoachPredictions =>
    cachedCompute('predictions', () => {
      const dayOfMonth = getCurrentDayOfMonth();
      const daysInMonth = getCurrentMonthDays();
      const historyCount = dailyGoalHistory.length;

      const dailyFocus = extractDailyFocusFromHistory(dailyGoalHistory);
      const dailySpending = extractDailySpendingFromHistory(dailyGoalHistory);
      const dailyProgress = extractDailyProgressFromHistory(dailyGoalHistory);

      const { momentumFactor } = calculateFocusMomentum(dailyFocus, profile.streak);
      const { velocity, factor: spendVelocityFactor } = calculateSpendingVelocity(dailySpending);

      const expectedMonthlyFocusMinutes = historyCount >= 4
        ? enhancedPredictMonthlyValue(dailyFocus, dayOfMonth, daysInMonth, momentumFactor)
        : linearExtrapolate(analytics.monthlyFocusMin, dayOfMonth, daysInMonth);

      const expectedMonthlySpending = historyCount >= 4
        ? enhancedPredictMonthlyValue(dailySpending, dayOfMonth, daysInMonth, spendVelocityFactor)
        : analytics.forecast.projectedMonthEndSpend;

      const expectedDailyProgress = historyCount >= 3
        ? clamp(Math.round(weightedMovingAverage(dailyProgress, 7)), 0, 100)
        : clamp(analytics.taskCompletionRate, 0, 100);

      const expectedProductivityScore = clamp(
        Math.round(analytics.productivityScore * (momentumFactor >= 1.0 ? 1.05 : 0.95)),
        0,
        100
      );

      const budgetExceededRatio = profile.monthly_budget > 0 ? expectedMonthlySpending / profile.monthly_budget : 1.0;
      const financialPenalty = budgetExceededRatio > 1.0 ? Math.round((budgetExceededRatio - 1.0) * 40) : -5;
      const expectedFinancialScore = clamp(analytics.financialScore - financialPenalty, 0, 100);

      const expectedWeeklyGrade = gradeFromScore(
        Math.round(expectedProductivityScore * 0.5 + expectedFinancialScore * 0.3 + expectedDailyProgress * 0.2)
      );

      const expectedMonthlyGrade = gradeFromScore(
        Math.round(expectedProductivityScore * 0.4 + expectedFinancialScore * 0.3 + expectedDailyProgress * 0.3)
      );

      const earlyRisks = getEarlyRisks();
      const daysUntilBudgetDepleted = earlyRisks.budgetExhaustionRisk.daysUntilExhaustion;

      return {
        expectedMonthlyFocusMinutes,
        expectedMonthlySpending,
        expectedDailyProgress,
        expectedProductivityScore,
        expectedFinancialScore,
        expectedWeeklyGrade,
        expectedMonthlyGrade,
        confidence: getPredictionConfidence(historyCount),
        dataPointsUsed: historyCount,
        daysUntilBudgetDepleted,
        spendingVelocityFactor: Math.round(spendVelocityFactor * 100) / 100,
        focusMomentumFactor: Math.round(momentumFactor * 100) / 100,
      };
    });

  const getRisks = (): readonly CoachRiskItem[] =>
    cachedCompute('risks', () => {
      const recommendations = getRecommendations();
      const fromRecs = recommendations
        .filter(r => r.priority === 'critical' || r.priority === 'high')
        .map(r => ({
          id: r.id,
          title: r.title,
          description: r.description,
          severity: r.priority,
          category: r.category,
          icon: r.icon,
          color: r.color,
          threshold: r.metric ?? {
            label: 'N/A',
            actual: 0,
            limit: 0,
            unit: '',
          },
          suggestedAction: r.action,
          probability: (r.urgency as any) || 'high',
        }));

      const earlyRisks = getEarlyRisks();
      const uniqueMap = new Map<string, CoachRiskItem>();

      fromRecs.forEach(r => uniqueMap.set(r.id, r));
      earlyRisks.topCriticalRisks.forEach(r => uniqueMap.set(r.id, r));

      return Array.from(uniqueMap.values());
    });

  const generateDailyBrief = (): DailyBrief =>
    cachedCompute('daily_brief', () => {
      const yesterdayHistory = dailyGoalHistory.find(h => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return h.date === format(yesterday, 'yyyy-MM-dd');
      });

      const pendingHighPriority = [...input.tasks]
        .filter(t => t.status === 'pending' && t.priority === 'high')
        .sort((a, b) => {
          if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
          if (a.deadline) return -1;
          if (b.deadline) return 1;
          return 0;
        })
        .slice(0, 3)
        .map(t => ({
          title: t.title,
          priority: 'high' as const,
          icon: '🔴',
        }));

      const pendingMedium = pendingHighPriority.length < 3
        ? [...input.tasks]
            .filter(t => t.status === 'pending' && t.priority === 'medium')
            .slice(0, 3 - pendingHighPriority.length)
            .map(t => ({
              title: t.title,
              priority: 'medium' as const,
              icon: '🟡',
            }))
        : [];

      const topPriorities = [...pendingHighPriority, ...pendingMedium];
      const riskAlerts = getRisks();
      const streakIsAtRisk = calculateStreakRisk(profile.streak, analytics.todayFocusMin, 0);

      const yesterdaySummary = yesterdayHistory
        ? `Yesterday: ${yesterdayHistory.focusMinutes}m focus, ${yesterdayHistory.tasksCompleted} tasks, ₹${yesterdayHistory.totalSpent} spent (${yesterdayHistory.completionPct}% goals).`
        : 'No data from yesterday — make today count!';

      const dailyBudget = profile.monthly_budget > 0
        ? Math.round((profile.monthly_budget - analytics.monthlySpent) / Math.max(1, getCurrentMonthDays() - getCurrentDayOfMonth() + 1))
        : 0;

      const habits = getHabits();

      return {
        greeting: getGreeting(profile.display_name),
        yesterdaySummary,
        topPriorities,
        riskAlerts,
        streakStatus: {
          currentStreak: profile.streak,
          isAtRisk: streakIsAtRisk,
          message: streakIsAtRisk
            ? `Your ${profile.streak}-day streak is at risk! Log some activity today.`
            : profile.streak > 0
              ? `${profile.streak}-day streak going strong!`
              : 'Start a new streak today by completing a task or focus session.',
        },
        predictions: {
          expectedFocusMinutes: preferences.default_daily_focus_goal || RULE_THRESHOLDS.DEFAULT_DAILY_FOCUS_GOAL,
          expectedTasksToComplete: topPriorities.length,
          budgetRemainingToday: Math.max(0, dailyBudget),
        },
        motivation: getMotivation(
          analytics.productivityScore,
          profile.streak,
          analytics.comparison.focusGrowthPct
        ),
        primeFocusWindow: habits.bestFocusHour.timeWindow,
      };
    });

  const generateEveningReview = (): EveningReview =>
    cachedCompute('evening_review', () => {
      const todayFocus = analytics.todayFocusMin;
      const todaySpent = analytics.todaySpent;
      const focusGoal = preferences.default_daily_focus_goal || RULE_THRESHOLDS.DEFAULT_DAILY_FOCUS_GOAL;
      const todayStr = getTodayDateString();

      const completedToday = input.tasks.filter(t =>
        t.status === 'completed' &&
        t.completed_at !== null &&
        t.completed_at.startsWith(todayStr)
      ).length;

      const accomplishments: EveningReview['accomplishments'] = [];
      if (todayFocus > 0) {
        accomplishments.push({
          title: 'Focus Time',
          value: `${todayFocus} minutes`,
          icon: '⏱️',
        });
      }
      if (completedToday > 0) {
        accomplishments.push({
          title: 'Tasks Completed',
          value: `${completedToday} task${completedToday !== 1 ? 's' : ''}`,
          icon: '✅',
        });
      }
      if (todaySpent > 0) {
        accomplishments.push({
          title: 'Expenses Tracked',
          value: `₹${Math.round(todaySpent)}`,
          icon: '💰',
        });
      }

      const missedTargets: EveningReview['missedTargets'] = [];
      if (todayFocus < focusGoal) {
        missedTargets.push({
          title: 'Focus Goal',
          expected: `${focusGoal}m`,
          actual: `${todayFocus}m`,
          icon: '⏱️',
        });
      }
      const overdueCount = input.tasks.filter(t =>
        t.status === 'pending' && t.deadline !== null && t.deadline <= todayStr
      ).length;
      if (overdueCount > 0) {
        missedTargets.push({
          title: 'Overdue Tasks',
          expected: '0',
          actual: `${overdueCount}`,
          icon: '⚠️',
        });
      }

      const tomorrowPriorities = [...input.tasks]
        .filter(t => t.status === 'pending')
        .sort((a, b) => {
          const aOverdue = a.deadline && a.deadline <= todayStr ? 1 : 0;
          const bOverdue = b.deadline && b.deadline <= todayStr ? 1 : 0;
          if (aOverdue !== bOverdue) return bOverdue - aOverdue;
          const priorityMap = { high: 0, medium: 1, low: 2 };
          return (priorityMap[a.priority] ?? 1) - (priorityMap[b.priority] ?? 1);
        })
        .slice(0, 3)
        .map(t => ({
          title: t.title,
          reason: t.deadline && t.deadline <= todayStr
            ? 'Overdue — needs immediate attention'
            : t.priority === 'high'
              ? 'High priority task'
              : 'Pending task',
          icon: t.deadline && t.deadline <= todayStr ? '🔴' : t.priority === 'high' ? '🟠' : '🟡',
        }));

      const focusAchievement = safePercent(todayFocus, focusGoal);
      const taskTarget = preferences.default_task_goal || RULE_THRESHOLDS.DEFAULT_TASK_GOAL;
      const taskAchievement = safePercent(completedToday, taskTarget);
      const dailyBudget = profile.monthly_budget > 0 ? profile.monthly_budget / getCurrentMonthDays() : 0;
      const budgetAchievement = dailyBudget > 0 && todaySpent <= dailyBudget ? 100 : dailyBudget > 0 ? clamp(100 - safePercent(todaySpent - dailyBudget, dailyBudget), 0, 100) : 50;

      const dayScore = clamp(
        Math.round(focusAchievement * 0.4 + taskAchievement * 0.35 + budgetAchievement * 0.25),
        0,
        100
      );

      return {
        heading: dayScore >= 80
          ? 'Excellent day!'
          : dayScore >= 60
            ? 'Good effort today.'
            : dayScore >= 40
              ? 'Some progress made.'
              : 'A quieter day — tomorrow is a fresh start.',
        accomplishments,
        missedTargets,
        tomorrowPriorities,
        dayScore,
        dayGrade: gradeFromScore(dayScore),
      };
    });

  const generateWeeklyReview = (): WeeklyReview =>
    cachedCompute('weekly_review', () => {
      const now = new Date();
      const weekNum = getWeek(now);
      const yearNum = getYear(now);
      const weekLabel = `Week ${weekNum}, ${yearNum}`;

      const trends = getTrends();

      const wins: WeeklyReview['wins'] = [];
      if (analytics.comparison.focusGrowthPct > 10) {
        wins.push({
          title: 'Focus Growth',
          description: `Focus time increased by ${analytics.comparison.focusGrowthPct}% vs previous period.`,
          icon: '📈',
          color: '#10b981',
        });
      }
      if (analytics.taskCompletionRate >= 80) {
        wins.push({
          title: 'High Task Completion',
          description: `Completed ${analytics.taskCompletionRate}% of all tasks.`,
          icon: '✅',
          color: '#06b6d4',
        });
      }
      if (analytics.budgetHealth === 'Healthy') {
        wins.push({
          title: 'Budget Healthy',
          description: `Spending at ${analytics.budgetUtilizationPct}% of budget — well controlled.`,
          icon: '💰',
          color: '#10b981',
        });
      }
      if (profile.streak >= 7) {
        wins.push({
          title: 'Streak Champion',
          description: `Maintained a ${profile.streak}-day active streak.`,
          icon: '🔥',
          color: '#f59e0b',
        });
      }

      const improvements: WeeklyReview['improvements'] = [];
      if (analytics.taskCompletionRate < 50 && analytics.totalTasksCount > 0) {
        improvements.push({
          title: 'Low Task Completion',
          description: `Only ${analytics.taskCompletionRate}% of tasks completed.`,
          icon: '⚠️',
          color: '#f59e0b',
        });
      }
      if (analytics.comparison.focusGrowthPct < -15) {
        improvements.push({
          title: 'Focus Decline',
          description: `Focus time dropped ${Math.abs(analytics.comparison.focusGrowthPct)}% vs previous period.`,
          icon: '📉',
          color: '#ef4444',
        });
      }

      const weekScore = analytics.overallWellnessScore;
      const weekGrade = gradeFromScore(weekScore);
      const weeklyRecs = getRecommendations().slice(0, 5);

      return {
        weekLabel,
        wins: wins.slice(0, 5),
        improvements: improvements.slice(0, 5),
        focusTrend: trends.focus,
        spendingTrend: trends.finance,
        taskTrend: trends.taskCompletion,
        weekScore,
        weekGrade,
        recommendations: weeklyRecs,
      };
    });

  const generateMonthlyReview = (): MonthlyReview =>
    cachedCompute('monthly_review', () => {
      const now = new Date();
      const monthLabel = format(now, 'MMMM yyyy');
      const report = input.monthlyReport;

      const monthScore = report?.overallScore ?? analytics.overallWellnessScore;
      const monthGrade = report?.grade ?? gradeFromScore(monthScore);

      const executiveSummary: string[] = report?.executiveSummary ?? [];
      if (executiveSummary.length === 0) {
        executiveSummary.push(
          `This month you focused for ${analytics.totalFocusHours}h, completed ${analytics.completedTasksCount} tasks, and spent ₹${Math.round(analytics.monthlySpent)}.`
        );
        if (analytics.productivityScore >= 70) {
          executiveSummary.push(`Your productivity score of ${analytics.productivityScore} reflects strong performance.`);
        }
        if (analytics.budgetHealth !== 'Healthy') {
          executiveSummary.push(`Budget health is ${analytics.budgetHealth} — monitor spending closely.`);
        }
      }

      const dailyFocus = extractDailyFocusFromHistory(dailyGoalHistory);
      const dailySpending = extractDailySpendingFromHistory(dailyGoalHistory);
      const dailyTasks = extractDailyTasksFromHistory(dailyGoalHistory);

      const trends: CoachTrendItem[] = [];
      const focusTrend = detectTrend(dailyFocus, 14);
      trends.push(buildTrendItem('Monthly Focus', focusTrend.direction, focusTrend.magnitudePct, 'focus'));
      const spendTrend = detectTrend(dailySpending, 14);
      trends.push(buildTrendItem('Monthly Spending', spendTrend.direction, spendTrend.magnitudePct, 'finance'));
      const tasksTrend = detectTrend(dailyTasks, 14);
      trends.push(buildTrendItem('Monthly Task Completion', tasksTrend.direction, tasksTrend.magnitudePct, 'tasks'));

      const allRecs = getRecommendations();
      const monthlyRecs = allRecs.filter(r => r.priority !== 'info').slice(0, 6);

      return {
        monthLabel,
        monthScore,
        monthGrade,
        executiveSummary,
        recommendations: monthlyRecs,
        trends,
        nextMonthPredictions: getPredictions(),
      };
    });

  const generateAchievementsSummary = (): AchievementsSummary =>
    cachedCompute('achievements', () => {
      const { profile: p, analytics: a } = input;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoffStr = format(thirtyDaysAgo, 'yyyy-MM-dd');

      const recentAchievements = p.badges
        .filter(b => b.unlockedAt && b.unlockedAt >= cutoffStr)
        .map(b => ({
          id: b.id,
          name: b.name,
          icon: b.icon,
          unlockedAt: b.unlockedAt,
        }));

      const milestones: AchievementsSummary['approachingMilestones'] = [];
      const totalFocusHours = a.totalFocusHours;
      const nextFocusMilestone = Math.ceil(totalFocusHours / 50) * 50;
      if (nextFocusMilestone > 0 && totalFocusHours >= nextFocusMilestone * 0.7) {
        milestones.push({
          title: `${nextFocusMilestone}h Focus Club`,
          description: `Reach ${nextFocusMilestone} total hours of focused work.`,
          progressPct: safePercent(totalFocusHours, nextFocusMilestone),
          icon: '⏱️',
          color: '#a855f7',
        });
      }

      const nextStreakMilestone = Math.ceil((p.streak + 1) / 7) * 7;
      if (p.streak > 0 && p.streak >= nextStreakMilestone - 3) {
        milestones.push({
          title: `${nextStreakMilestone}-Day Streak`,
          description: `Maintain your streak for ${nextStreakMilestone} consecutive days.`,
          progressPct: safePercent(p.streak, nextStreakMilestone),
          icon: '🔥',
          color: '#f59e0b',
        });
      }

      const currentLevel = Math.floor(p.xp / 100) + 1;

      return {
        recentAchievements,
        approachingMilestones: milestones.slice(0, 5),
        periodXP: p.xp,
        currentLevel,
        totalBadges: p.badges.length,
      };
    });

  // ─── Unified Complete Output Generation ──────────────────
  const generateCompleteOutput = (): CoachOutput => {
    const output: CoachOutput = {
      dailyBrief: generateDailyBrief(),
      eveningReview: generateEveningReview(),
      weeklyReview: generateWeeklyReview(),
      monthlyReview: generateMonthlyReview(),
      recommendations: getRecommendations(),
      predictions: getPredictions(),
      risks: getRisks(),
      achievementsSummary: generateAchievementsSummary(),
      habits: getHabits(),
      behaviourTrends: getTrends(),
      earlyRisks: getEarlyRisks(),
      timeline: getTimeline(),
    };

    // Update Repository and Snapshot History
    coachRepository.setLatestOutput(output);
    coachHistory.addSnapshot(output, contextHash);
    coachScheduler.markComputed(input);
    coachMetrics.updateHistorySize(coachHistory.size());

    // Dev validation check
    if (process.env.NODE_ENV === 'development') {
      const validation = validateCoachOutput(output);
      if (!validation.isValid) {
        console.warn('[CoachEngine] Output validation warnings:', validation.warnings, validation.errors);
      }
    }

    return output;
  };

  return {
    generateDailyBrief,
    generateEveningReview,
    generateWeeklyReview,
    generateMonthlyReview,
    generateRecommendations: getRecommendations,
    generatePredictions: getPredictions,
    generateRiskAssessment: getRisks,
    generateAchievementsSummary,
    generateHabitAnalysis: getHabits,
    generateBehaviourTrends: getTrends,
    generateEarlyRisks: getEarlyRisks,
    generateTimeline: getTimeline,
    generateCompleteOutput,
  };
}
