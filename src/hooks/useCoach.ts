/**
 * useCoach — React hook for the AI Coach Engine (Phase 3.9.5 Enhanced)
 *
 * Instantiates the Coach Engine with real application data and exposes
 * all coach generation methods via a memoized, read-only interface.
 *
 * Key design decisions:
 * - Uses useMemo to recompute the engine ONLY when store data changes
 * - Dependency arrays use array lengths and scalar values for stability
 * - Engine methods are themselves memoized (see coachEngine.ts), so
 *   repeated reads of the same method return cached results
 * - Never throws — returns safe fallback data on any failure
 * - Never mutates application state
 * - Never renders UI
 *
 * Exposes:
 * - dailyBrief
 * - eveningReview
 * - weeklyReview
 * - monthlyReview
 * - recommendations (ranked & explainable)
 * - predictions (enhanced predictive algorithms)
 * - riskAssessment
 * - achievementsSummary
 * - habits (Habit Detection Layer)
 * - behaviourTrends (5-Facet Trend Analysis)
 * - earlyRisks (Early Risk Detection Engine)
 * - timeline (Chronological Timeline Events)
 * - coachHealth
 *
 * @module hooks/useCoach
 */

import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useDailyGoalsStore } from '../store/useDailyGoalsStore';
import { buildCoachContext } from '../lib/coach/coachContext';
import { createCoachEngine } from '../lib/coach/coachEngine';
import type { CoachEngine } from '../lib/coach/coachEngine';
import type {
  DailyBrief,
  EveningReview,
  WeeklyReview,
  MonthlyReview,
  CoachRecommendation,
  CoachPredictions,
  CoachRiskItem,
  AchievementsSummary,
  CoachHabitAnalysis,
  CoachBehaviourTrends,
  CoachEarlyRiskReport,
  CoachTimelineEvent,
} from '../lib/coach/coachTypes';

// ═══════════════════════════════════════════════════════════════
// Coach Health Status
// ═══════════════════════════════════════════════════════════════

export interface CoachHealth {
  /** Whether the coach engine was successfully initialized */
  readonly isHealthy: boolean;
  /** Whether there is enough data for meaningful coaching */
  readonly hasData: boolean;
  /** Number of data points available for predictions */
  readonly dataPoints: number;
  /** Error message if initialization failed (development only) */
  readonly error?: string;
}

// ═══════════════════════════════════════════════════════════════
// Hook Return Type
// ═══════════════════════════════════════════════════════════════

export interface UseCoachReturn {
  /** Morning brief (greeting, priorities, risks, streak, prime focus window) */
  readonly dailyBrief: DailyBrief | null;
  /** Evening review (accomplishments, missed targets, day score) */
  readonly eveningReview: EveningReview | null;
  /** Weekly review (wins, improvements, trends, grade) */
  readonly weeklyReview: WeeklyReview | null;
  /** Monthly review (enriched report, trends, predictions) */
  readonly monthlyReview: MonthlyReview | null;
  /** All recommendations ranked by composite score with explainability */
  readonly recommendations: readonly CoachRecommendation[];
  /** Projected values for current period */
  readonly predictions: CoachPredictions | null;
  /** Critical and high severity risk items */
  readonly riskAssessment: readonly CoachRiskItem[];
  /** Recent achievements and approaching milestones */
  readonly achievementsSummary: AchievementsSummary | null;
  /** Habit Detection Layer: peak days, focus hours, weekend dynamics, procrastination patterns */
  readonly habits: CoachHabitAnalysis | null;
  /** 5-Facet Behaviour Trend Analysis with momentum scoring */
  readonly behaviourTrends: CoachBehaviourTrends | null;
  /** Early Risk Detection Engine: streak, burnout, budget, tasks, savings */
  readonly earlyRisks: CoachEarlyRiskReport | null;
  /** Chronological coach timeline events */
  readonly timeline: readonly CoachTimelineEvent[];
  /** Engine health status */
  readonly coachHealth: CoachHealth;
}

// ═══════════════════════════════════════════════════════════════
// Safe fallback values
// ═══════════════════════════════════════════════════════════════

const EMPTY_RECOMMENDATIONS: readonly CoachRecommendation[] = [];
const EMPTY_RISKS: readonly CoachRiskItem[] = [];
const EMPTY_TIMELINE: readonly CoachTimelineEvent[] = [];

const UNHEALTHY_RETURN: UseCoachReturn = {
  dailyBrief: null,
  eveningReview: null,
  weeklyReview: null,
  monthlyReview: null,
  recommendations: EMPTY_RECOMMENDATIONS,
  predictions: null,
  riskAssessment: EMPTY_RISKS,
  achievementsSummary: null,
  habits: null,
  behaviourTrends: null,
  earlyRisks: null,
  timeline: EMPTY_TIMELINE,
  coachHealth: {
    isHealthy: false,
    hasData: false,
    dataPoints: 0,
  },
};

// ═══════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════

/**
 * React hook that wires the AI Coach Engine to real application data.
 *
 * The hook is read-only — it never mutates application state, never
 * triggers side effects, and never modifies the store.
 */
export function useCoach(): UseCoachReturn {
  // ─── Read store data ─────────────────────────────────
  const tasks = useStore(s => s.tasks);
  const focusSessions = useStore(s => s.focusSessions);
  const expenses = useStore(s => s.expenses);
  const savingsGoals = useStore(s => s.savingsGoals);
  const profile = useStore(s => s.profile);
  const preferences = useStore(s => s.preferences);
  const events = useStore(s => s.events);
  const dailyGoalHistory = useDailyGoalsStore(s => s.history);

  // ─── Build engine (memoized) ─────────────────────────
  const engine = useMemo((): CoachEngine | null => {
    try {
      const context = buildCoachContext(
        {
          tasks,
          focusSessions,
          expenses,
          savingsGoals,
          profile,
          preferences,
          events,
          dailyGoalHistory,
        },
        { period: '30d', includeMonthlyReport: false }
      );

      return createCoachEngine(context);
    } catch (err) {
      if (import.meta.env.NODE_ENV === 'development') {
        console.warn('[useCoach] Failed to create coach engine:', err);
      }
      return null;
    }
  }, [
    tasks.length,
    focusSessions.length,
    expenses.length,
    savingsGoals.length,
    events.length,
    dailyGoalHistory.length,
    profile.xp,
    profile.streak,
    profile.monthly_budget,
    profile.display_name,
    preferences.default_daily_focus_goal,
    preferences.default_task_goal,
    preferences.default_monthly_budget,
  ]);

  // ─── Generate outputs (memoized via engine internals) ─
  return useMemo((): UseCoachReturn => {
    if (!engine) {
      return UNHEALTHY_RETURN;
    }

    try {
      const dailyBrief = engine.generateDailyBrief();
      const recommendations = engine.generateRecommendations();
      const predictions = engine.generatePredictions();
      const riskAssessment = engine.generateRiskAssessment();
      const achievementsSummary = engine.generateAchievementsSummary();
      const habits = engine.generateHabitAnalysis();
      const behaviourTrends = engine.generateBehaviourTrends();
      const earlyRisks = engine.generateEarlyRisks();
      const timeline = engine.generateTimeline();

      // Heavier review computations (safely guarded)
      let eveningReview: EveningReview | null = null;
      let weeklyReview: WeeklyReview | null = null;
      let monthlyReview: MonthlyReview | null = null;

      try { eveningReview = engine.generateEveningReview(); } catch { /* graceful */ }
      try { weeklyReview = engine.generateWeeklyReview(); } catch { /* graceful */ }
      try { monthlyReview = engine.generateMonthlyReview(); } catch { /* graceful */ }

      return {
        dailyBrief,
        eveningReview,
        weeklyReview,
        monthlyReview,
        recommendations,
        predictions,
        riskAssessment,
        achievementsSummary,
        habits,
        behaviourTrends,
        earlyRisks,
        timeline,
        coachHealth: {
          isHealthy: true,
          hasData: predictions.dataPointsUsed > 0,
          dataPoints: predictions.dataPointsUsed,
        },
      };
    } catch (err) {
      if (import.meta.env.NODE_ENV === 'development') {
        console.warn('[useCoach] Failed to generate coach outputs:', err);
      }
      return {
        ...UNHEALTHY_RETURN,
        coachHealth: {
          isHealthy: false,
          hasData: false,
          dataPoints: 0,
          error: err instanceof Error ? err.message : 'Unknown error',
        },
      };
    }
  }, [engine]);
}
