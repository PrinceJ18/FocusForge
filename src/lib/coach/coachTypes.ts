/**
 * Coach Engine — Type Definitions
 *
 * Defines the complete type system for the FocusForge AI Coach engine.
 * All types are pure data contracts with no React/JSX dependencies.
 *
 * This module is the foundation of the coach system — every other coach
 * module imports its types from here.
 *
 * @module coach/coachTypes
 */

import type { AnalyticsEngineResult } from '../statistics/analyticsEngine';
import type { MonthlyReportData } from '../statistics/reports';
import type { DailyGoalHistory } from '../../store/useDailyGoalsStore';
import type { Task, FocusSession, Expense, Profile, SavingsGoal, UserPreferences } from '../../store/slices/types';
import type { AppEvent } from '../events';

// ═══════════════════════════════════════════════════════════════
// Enumerations
// ═══════════════════════════════════════════════════════════════

/**
 * Priority levels for coach recommendations and risk items.
 * Ordered from most to least urgent.
 *
 * - `critical`: Immediate action required (e.g., streak about to break)
 * - `high`: Important and should be addressed soon
 * - `medium`: Moderate importance, plan for it
 * - `low`: Nice-to-have improvement
 * - `info`: Informational, positive reinforcement
 */
export type CoachPriority = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * Categories that recommendations and insights can belong to.
 * Maps to the different facets of the FocusForge experience.
 */
export type CoachCategory =
  | 'productivity'
  | 'finance'
  | 'focus'
  | 'tasks'
  | 'habits'
  | 'streak'
  | 'savings'
  | 'wellness';

/**
 * Direction of a detected trend over a time window.
 */
export type TrendDirection = 'improving' | 'declining' | 'stable';

/**
 * Velocity / Acceleration classification.
 */
export type VelocityDirection = 'accelerating' | 'stable' | 'decelerating';

// ═══════════════════════════════════════════════════════════════
// Explainability & Ranking Types
// ═══════════════════════════════════════════════════════════════

/**
 * Detailed explainability payload attached to recommendations.
 */
export interface CoachExplainability {
  /** Causal explanation of why this recommendation was generated */
  readonly why: string;
  /** Explicit trigger metrics evaluated by the rule */
  readonly triggerMetrics: ReadonlyArray<{
    readonly label: string;
    readonly current: number | string;
    readonly threshold: number | string;
    readonly unit: string;
  }>;
  /** Concrete estimated improvement if user implements the advice */
  readonly expectedImprovement: string;
  /** Associated metric names impacted by this action */
  readonly relatedMetrics: ReadonlyArray<string>;
}

/**
 * A single actionable recommendation from the coach.
 * Enhanced in Phase 3.9.5 with ranking dimensions and explainability.
 *
 * Future consumers: Dashboard (morning brief card), Analytics (recommendations panel),
 * Reports (enhanced AI recommendations section), Notification Center (push alerts).
 */
export interface CoachRecommendation {
  /** Unique identifier for deduplication (e.g., 'rule_focus_below_avg') */
  readonly id: string;
  /** Human-readable title (e.g., 'Focus Below Weekly Average') */
  readonly title: string;
  /** Detailed description with concrete numbers */
  readonly description: string;
  /** Actionable suggestion for the user */
  readonly action: string;
  /** Urgency level */
  readonly priority: CoachPriority;
  /** Which area of the app this relates to */
  readonly category: CoachCategory;
  /** Emoji icon for UI rendering */
  readonly icon: string;
  /** Hex color for UI rendering */
  readonly color: string;
  /** Optional metric that triggered this recommendation */
  readonly metric?: {
    readonly label: string;
    readonly current: number;
    readonly threshold: number;
    readonly unit: string;
  };
  /** Estimated impact rating on user productivity/finances */
  readonly impact?: 'high' | 'medium' | 'low';
  /** Urgency level of required action */
  readonly urgency?: 'high' | 'medium' | 'low';
  /** Confidence score or level in this recommendation */
  readonly confidence?: 'high' | 'medium' | 'low';
  /** Human-readable description of estimated benefit */
  readonly estimatedBenefit?: string;
  /** Estimated effort required from the user */
  readonly estimatedEffort?: 'low' | 'medium' | 'high';
  /** Computed ranking score (0-100) for deterministic ordering */
  readonly rankingScore?: number;
  /** Comprehensive explainability metadata */
  readonly explainability?: CoachExplainability;
}

/**
 * A detected risk that the coach has identified.
 * Risks are a subset of recommendations with severity context.
 *
 * Future consumers: Dashboard (risk alert banner), Notification Center.
 */
export interface CoachRiskItem {
  /** Unique identifier */
  readonly id: string;
  /** What is at risk */
  readonly title: string;
  /** Detailed explanation of the risk */
  readonly description: string;
  /** How severe is this risk */
  readonly severity: CoachPriority;
  /** Area affected */
  readonly category: CoachCategory;
  /** Emoji icon */
  readonly icon: string;
  /** Hex color */
  readonly color: string;
  /** The threshold that was breached */
  readonly threshold: {
    readonly label: string;
    readonly actual: number;
    readonly limit: number;
    readonly unit: string;
  };
  /** Suggested immediate mitigation action */
  readonly suggestedAction?: string;
  /** Computed probability of occurrence */
  readonly probability?: 'high' | 'medium' | 'low';
}

/**
 * A detected trend in user behavior over a time window.
 *
 * Future consumers: Analytics (trend overlay on charts), Dashboard (trend badges).
 */
export interface CoachTrendItem {
  /** What metric is trending */
  readonly metric: string;
  /** Direction of the trend */
  readonly direction: TrendDirection;
  /** Magnitude of change as a percentage */
  readonly magnitudePct: number;
  /** Human-readable summary */
  readonly summary: string;
  /** Area this trend belongs to */
  readonly category: CoachCategory;
  /** Emoji icon */
  readonly icon: string;
  /** Hex color */
  readonly color: string;
  /** Baseline value before trend window */
  readonly baselineValue?: number;
  /** Current window value */
  readonly currentValue?: number;
  /** Confidence rating in trend detection */
  readonly confidence?: 'high' | 'medium' | 'low';
}

// ═══════════════════════════════════════════════════════════════
// Habit Detection Types (Phase 3.9.5 Task 1)
// ═══════════════════════════════════════════════════════════════

export interface WeekdayPerformance {
  readonly dayIndex: number; // 0 = Sunday, 1 = Monday, etc.
  readonly dayName: string;
  readonly avgFocusMinutes: number;
  readonly avgTasksCompleted: number;
  readonly avgSpending: number;
  readonly sessionCount: number;
}

export interface FocusHourSlot {
  readonly hour: number; // 0-23
  readonly timeWindow: string; // e.g. "09:00 - 10:00"
  readonly sessionCount: number;
  readonly totalMinutes: number;
  readonly avgMinutes: number;
}

export interface WeekendBehaviour {
  readonly weekendAvgFocusMin: number;
  readonly weekdayAvgFocusMin: number;
  readonly weekendAvgSpend: number;
  readonly weekdayAvgSpend: number;
  readonly focusRatioWeekendToWeekday: number;
  readonly spendRatioWeekendToWeekday: number;
  readonly pattern: 'productive_weekend' | 'relaxed_weekend' | 'high_spending_weekend' | 'balanced';
  readonly insight: string;
}

export interface SpendingHabitAnalysis {
  readonly topSpendingCategory: string;
  readonly frequentSmallSpendsCount: number; // Transactions < ₹200
  readonly largeSpendsCount: number; // Transactions > ₹1000
  readonly peakSpendingDay: string;
  readonly impulsiveSpendingDayCount: number; // Spend > 1.5x avg on days with low focus
  readonly dailySpendVariance: number;
  readonly summary: string;
}

export interface ProcrastinationPatternAnalysis {
  readonly lastMinuteTasksCompleted: number; // Completed within 2 hours of deadline
  readonly overdueBacklogAgingDays: number; // Average age in days of pending overdue tasks
  readonly delayFrequencyScore: number; // 0-100 (100 = severe delay habit)
  readonly tendency: 'proactive' | 'moderate' | 'chronic_delay';
  readonly patternSummary: string;
}

export interface CoachHabitAnalysis {
  readonly bestWeekday: WeekdayPerformance;
  readonly weakestWeekday: WeekdayPerformance;
  readonly allWeekdays: ReadonlyArray<WeekdayPerformance>;
  readonly bestFocusHour: FocusHourSlot;
  readonly weakestFocusHour: FocusHourSlot;
  readonly hourlyDistribution: ReadonlyArray<FocusHourSlot>;
  readonly weekendBehaviour: WeekendBehaviour;
  readonly spendingHabits: SpendingHabitAnalysis;
  readonly procrastinationPatterns: ProcrastinationPatternAnalysis;
  readonly consistencyScore: number; // 0-100
  readonly consistencyTrend: TrendDirection;
  readonly primaryHabitStrength: string;
  readonly primaryHabitLeak: string;
}

// ═══════════════════════════════════════════════════════════════
// Behaviour Trend Analysis Types (Phase 3.9.5 Task 2)
// ═══════════════════════════════════════════════════════════════

export interface CoachBehaviourTrends {
  readonly productivity: CoachTrendItem;
  readonly focus: CoachTrendItem;
  readonly finance: CoachTrendItem;
  readonly taskCompletion: CoachTrendItem;
  readonly consistency: CoachTrendItem;
  readonly overallDirection: TrendDirection;
  readonly trendMomentumScore: number; // -100 to +100
  readonly keyInsight: string;
}

// ═══════════════════════════════════════════════════════════════
// Early Risk Detection Types (Phase 3.9.5 Task 3)
// ═══════════════════════════════════════════════════════════════

export interface StreakLossRisk {
  readonly riskScore: number; // 0-100
  readonly isImminent: boolean;
  readonly hoursRemainingToday: number;
  readonly probability: 'critical' | 'high' | 'medium' | 'low' | 'none';
  readonly advice: string;
}

export interface BudgetExhaustionRisk {
  readonly riskScore: number; // 0-100
  readonly daysUntilExhaustion: number | null;
  readonly projectedDeficit: number;
  readonly velocity: VelocityDirection;
  readonly probability: 'critical' | 'high' | 'medium' | 'low' | 'none';
  readonly advice: string;
}

export interface BurnoutRisk {
  readonly riskScore: number; // 0-100
  readonly consecutiveHighFocusDays: number;
  readonly lateNightSessionCount: number;
  readonly level: 'low' | 'moderate' | 'high' | 'critical';
  readonly advice: string;
}

export interface OverdueTaskRisk {
  readonly riskScore: number; // 0-100
  readonly overdueCount: number;
  readonly imminentCount: number; // Due in < 24 hours
  readonly highPriorityAtRiskCount: number;
  readonly advice: string;
}

export interface SavingsGoalRisk {
  readonly riskScore: number; // 0-100
  readonly atRiskGoalsCount: number;
  readonly totalShortfall: number;
  readonly advice: string;
}

export interface CoachEarlyRiskReport {
  readonly overallRiskLevel: 'critical' | 'high' | 'medium' | 'low' | 'minimal';
  readonly streakLossRisk: StreakLossRisk;
  readonly budgetExhaustionRisk: BudgetExhaustionRisk;
  readonly burnoutRisk: BurnoutRisk;
  readonly overdueTaskRisk: OverdueTaskRisk;
  readonly savingsGoalRisk: SavingsGoalRisk;
  readonly topCriticalRisks: ReadonlyArray<CoachRiskItem>;
}

// ═══════════════════════════════════════════════════════════════
// Coach Timeline Event (Phase 3.9.5 Task 7)
// ═══════════════════════════════════════════════════════════════

export interface CoachTimelineEvent {
  readonly id: string;
  readonly timestamp: string; // ISO 8601 string or yyyy-MM-dd
  readonly type:
    | 'trend_shift'
    | 'milestone'
    | 'risk_detected'
    | 'habit_formed'
    | 'achievement'
    | 'goal_projection';
  readonly category: CoachCategory;
  readonly title: string;
  readonly description: string;
  readonly importance: CoachPriority;
  readonly icon: string;
  readonly metadata?: Record<string, string | number | boolean | null>;
}

// ═══════════════════════════════════════════════════════════════
// Prediction Types (Phase 3.9.5 Task 4 Enhanced)
// ═══════════════════════════════════════════════════════════════

/**
 * Projected values for the remainder of the current period.
 * All predictions are computed using weighted moving average, exponential smoothing,
 * streak momentum, spending velocity, and activity decay.
 *
 * Future consumers: Analytics (predictions panel), Dashboard (forecast widgets),
 * Reports (prediction accuracy tracking).
 */
export interface CoachPredictions {
  /** Expected total focus minutes for the current month */
  readonly expectedMonthlyFocusMinutes: number;
  /** Expected total spending for the current month */
  readonly expectedMonthlySpending: number;
  /** Expected daily progress score (0–100) based on recent trend */
  readonly expectedDailyProgress: number;
  /** Expected productivity score (0–100) */
  readonly expectedProductivityScore: number;
  /** Expected financial health score (0–100) */
  readonly expectedFinancialScore: number;
  /** Expected letter grade for the current week */
  readonly expectedWeeklyGrade: string;
  /** Expected letter grade for the current month */
  readonly expectedMonthlyGrade: string;
  /** Confidence level of predictions (based on data availability) */
  readonly confidence: 'high' | 'medium' | 'low';
  /** Number of days of historical data used */
  readonly dataPointsUsed: number;
  /** Estimated days until monthly budget exhaustion */
  readonly daysUntilBudgetDepleted?: number | null;
  /** Spending velocity factor (1.0 = normal, >1.0 = accelerating, <1.0 = decelerating) */
  readonly spendingVelocityFactor?: number;
  /** Focus momentum factor (1.0 = baseline, >1.0 = upward momentum) */
  readonly focusMomentumFactor?: number;
}

// ═══════════════════════════════════════════════════════════════
// Briefing & Review Types
// ═══════════════════════════════════════════════════════════════

/**
 * Morning brief — a daily coaching snapshot to start the day.
 *
 * Future consumers: Dashboard (morning brief card).
 */
export interface DailyBrief {
  /** Greeting message (e.g., "Good morning, Prince!") */
  readonly greeting: string;
  /** Quick summary of yesterday's performance */
  readonly yesterdaySummary: string;
  /** Top priorities for today based on pending tasks & goals */
  readonly topPriorities: ReadonlyArray<{
    readonly title: string;
    readonly priority: CoachPriority;
    readonly icon: string;
  }>;
  /** Active risk alerts that need attention */
  readonly riskAlerts: ReadonlyArray<CoachRiskItem>;
  /** Current streak status */
  readonly streakStatus: {
    readonly currentStreak: number;
    readonly isAtRisk: boolean;
    readonly message: string;
  };
  /** Today's prediction snapshot */
  readonly predictions: {
    readonly expectedFocusMinutes: number;
    readonly expectedTasksToComplete: number;
    readonly budgetRemainingToday: number;
  };
  /** One motivational line based on current performance */
  readonly motivation: string;
  /** Today's prime focus window prediction (e.g. "09:00 - 11:00") */
  readonly primeFocusWindow?: string;
}

/**
 * Evening review — a daily coaching summary at end of day.
 *
 * Future consumers: Dashboard (evening review card).
 */
export interface EveningReview {
  /** Summary heading */
  readonly heading: string;
  /** What was accomplished today */
  readonly accomplishments: ReadonlyArray<{
    readonly title: string;
    readonly value: string;
    readonly icon: string;
  }>;
  /** What was missed or fell short */
  readonly missedTargets: ReadonlyArray<{
    readonly title: string;
    readonly expected: string;
    readonly actual: string;
    readonly icon: string;
  }>;
  /** Suggested priorities for tomorrow */
  readonly tomorrowPriorities: ReadonlyArray<{
    readonly title: string;
    readonly reason: string;
    readonly icon: string;
  }>;
  /** Day score (0–100) */
  readonly dayScore: number;
  /** Day grade letter */
  readonly dayGrade: string;
}

/**
 * Weekly review — aggregated coaching for the past 7 days.
 *
 * Future consumers: Analytics (weekly summary card), Reports (weekly trend).
 */
export interface WeeklyReview {
  /** Week label (e.g., "Week 34, 2026") */
  readonly weekLabel: string;
  /** Wins of the week */
  readonly wins: ReadonlyArray<{
    readonly title: string;
    readonly description: string;
    readonly icon: string;
    readonly color: string;
  }>;
  /** Areas for improvement */
  readonly improvements: ReadonlyArray<{
    readonly title: string;
    readonly description: string;
    readonly icon: string;
    readonly color: string;
  }>;
  /** Focus trend for the week */
  readonly focusTrend: CoachTrendItem;
  /** Spending trend for the week */
  readonly spendingTrend: CoachTrendItem;
  /** Task completion trend */
  readonly taskTrend: CoachTrendItem;
  /** Overall week score (0–100) */
  readonly weekScore: number;
  /** Week grade letter */
  readonly weekGrade: string;
  /** Actionable recommendations for next week */
  readonly recommendations: ReadonlyArray<CoachRecommendation>;
}

/**
 * Monthly review — extends existing MonthlyReportData with coach-enriched insights.
 *
 * Future consumers: Reports (enhanced monthly report).
 */
export interface MonthlyReview {
  /** Month label (e.g., "August 2026") */
  readonly monthLabel: string;
  /** Overall month score from the report */
  readonly monthScore: number;
  /** Month grade */
  readonly monthGrade: string;
  /** Coach-enriched executive summary lines */
  readonly executiveSummary: ReadonlyArray<string>;
  /** Coach recommendations for next month */
  readonly recommendations: ReadonlyArray<CoachRecommendation>;
  /** Detected trends across the month */
  readonly trends: ReadonlyArray<CoachTrendItem>;
  /** Predictions for next month */
  readonly nextMonthPredictions: CoachPredictions;
}

/**
 * Achievements summary — recent milestones and approaching goals.
 *
 * Future consumers: Dashboard (achievements widget), Achievements page.
 */
export interface AchievementsSummary {
  /** Recently unlocked achievements/badges */
  readonly recentAchievements: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly icon: string;
    readonly unlockedAt: string;
  }>;
  /** Milestones that are close to being reached */
  readonly approachingMilestones: ReadonlyArray<{
    readonly title: string;
    readonly description: string;
    readonly progressPct: number;
    readonly icon: string;
    readonly color: string;
  }>;
  /** Total XP earned in current period */
  readonly periodXP: number;
  /** Current level info */
  readonly currentLevel: number;
  /** Badges count */
  readonly totalBadges: number;
}

// ═══════════════════════════════════════════════════════════════
// Engine Input & Output
// ═══════════════════════════════════════════════════════════════

/**
 * Input contract for the Coach Engine.
 *
 * Accepts pre-computed results from the Analytics Engine and Reports Engine
 * to avoid duplicating any calculations. Also accepts raw store data for
 * rules that need granular access (e.g., individual task deadlines).
 *
 * Dependencies:
 * - AnalyticsEngineResult: from lib/statistics/analyticsEngine.ts
 * - MonthlyReportData: from lib/statistics/reports.ts
 * - DailyGoalHistory: from store/useDailyGoalsStore.ts
 * - Raw store types: from store/slices/types.ts
 */
export interface CoachInput {
  /** Pre-computed analytics engine output (current period) */
  readonly analytics: AnalyticsEngineResult;
  /** Pre-computed monthly report data (current month, optional for non-report contexts) */
  readonly monthlyReport?: MonthlyReportData;
  /** Daily goal history snapshots (up to 90 days) */
  readonly dailyGoalHistory: ReadonlyArray<DailyGoalHistory>;

  // Raw store data for granular rule evaluation
  readonly tasks: ReadonlyArray<Task>;
  readonly focusSessions: ReadonlyArray<FocusSession>;
  readonly expenses: ReadonlyArray<Expense>;
  readonly profile: Profile;
  readonly savingsGoals: ReadonlyArray<SavingsGoal>;
  readonly events: ReadonlyArray<AppEvent>;
  readonly preferences: UserPreferences;
}

/**
 * Complete output from a single Coach Engine run.
 *
 * Each field is lazily computed and memoized — calling the same
 * generation method twice returns the cached result.
 */
export interface CoachOutput {
  readonly dailyBrief: DailyBrief;
  readonly eveningReview: EveningReview;
  readonly weeklyReview: WeeklyReview;
  readonly monthlyReview: MonthlyReview;
  readonly recommendations: ReadonlyArray<CoachRecommendation>;
  readonly predictions: CoachPredictions;
  readonly risks: ReadonlyArray<CoachRiskItem>;
  readonly achievementsSummary: AchievementsSummary;
  readonly habits: CoachHabitAnalysis;
  readonly behaviourTrends: CoachBehaviourTrends;
  readonly earlyRisks: CoachEarlyRiskReport;
  readonly timeline: ReadonlyArray<CoachTimelineEvent>;
}

// ═══════════════════════════════════════════════════════════════
// Rule System Types
// ═══════════════════════════════════════════════════════════════

/**
 * A single deterministic coach rule.
 *
 * Rules are pure functions that evaluate input data against thresholds
 * and return a recommendation if the condition is met, or null if not.
 *
 * Every rule must be:
 * - Deterministic (same input → same output)
 * - Pure (no side effects, no store access)
 * - Self-contained (all data comes from CoachInput)
 */
export interface CoachRule {
  /** Unique rule identifier */
  readonly id: string;
  /** Human-readable rule name */
  readonly name: string;
  /** Which category this rule evaluates */
  readonly category: CoachCategory;
  /** Default priority if the rule fires */
  readonly defaultPriority: CoachPriority;
  /**
   * Evaluate the rule against input data.
   * Returns a recommendation if the rule fires, null otherwise.
   */
  readonly evaluate: (input: CoachInput) => CoachRecommendation | null;
}
