/**
 * Coach Engine — Central Constants & Configuration (Phase 3.9.6)
 *
 * Centralizes all numerical thresholds, weights, multipliers, penalty factors,
 * time intervals, and default configurations used throughout the AI Coach system.
 * Eliminates magic numbers and duplicate literals.
 *
 * All constants are immutable and deterministic.
 *
 * @module coach/coachConstants
 */

import type { CoachPriority, CoachCategory } from './coachTypes';

// ═══════════════════════════════════════════════════════════════
// Cache & Infrastructure Defaults
// ═══════════════════════════════════════════════════════════════

export const COACH_INFRASTRUCTURE = {
  CACHE_VERSION: '1.0.0',
  DEFAULT_CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes
  EXTENDED_CACHE_TTL_MS: 30 * 60 * 1000, // 30 minutes
  MAX_HISTORY_SNAPSHOTS: 50,
  DEFAULT_SCHEDULER_INTERVAL_MS: 2 * 60 * 1000, // 2 minutes
} as const;

// ═══════════════════════════════════════════════════════════════
// Priority & Urgency Rankings
// ═══════════════════════════════════════════════════════════════

export const PRIORITY_BASE_SCORES: Readonly<Record<CoachPriority, number>> = {
  critical: 100,
  high: 80,
  medium: 55,
  low: 35,
  info: 20,
};

export const PRIORITY_SORT_ORDER: Readonly<Record<CoachPriority, number>> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

export const RANKING_WEIGHTS = {
  BASE_PRIORITY_WEIGHT: 0.35,
  IMPACT_WEIGHT: 0.30,
  URGENCY_WEIGHT: 0.25,
  IMPACT_MULTIPLIERS: {
    high: 1.0,
    medium: 0.70,
    low: 0.40,
  },
  URGENCY_MULTIPLIERS: {
    high: 1.0,
    medium: 0.65,
    low: 0.35,
  },
  EFFORT_PENALTIES: {
    high: 10,
    medium: 5,
    low: 0,
  },
  CONFIDENCE_MULTIPLIERS: {
    high: 1.0,
    medium: 0.85,
    low: 0.65,
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// Predictive Modeling Coefficients (Phase 3.9.5 Enhanced)
// ═══════════════════════════════════════════════════════════════

export const PREDICTION_COEFFICIENTS = {
  EWMA_ALPHA: 0.35,
  TIME_DECAY_FACTOR: 0.88,
  WMA_WINDOW_SIZE: 7,
  RATE_BLEND_WEIGHTS: {
    EWMA: 0.40,
    DECAY: 0.35,
    WMA: 0.25,
  },
  MOMENTUM: {
    STREAK_BONUS_PER_DAY: 0.02,
    MAX_STREAK_BONUS: 0.20,
    MIN_MOMENTUM_FACTOR: 0.60,
    MAX_MOMENTUM_FACTOR: 1.50,
  },
  SPENDING_VELOCITY: {
    ACCELERATION_THRESHOLD: 1.15,
    DECELERATION_THRESHOLD: 0.85,
    MIN_FACTOR: 0.50,
    MAX_FACTOR: 2.50,
  },
  CONFIDENCE_THRESHOLDS: {
    HIGH_DATA_POINTS: 30,
    MEDIUM_DATA_POINTS: 14,
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// Early Risk Thresholds
// ═══════════════════════════════════════════════════════════════

export const RISK_THRESHOLDS = {
  STREAK: {
    CRITICAL_HOURS_LEFT: 4,
    HIGH_HOURS_LEFT: 8,
    MEDIUM_HOURS_LEFT: 14,
    HIGH_STREAK_PROTECTION_MIN_DAYS: 7,
  },
  BUDGET: {
    CRITICAL_UTILIZATION_PCT: 100,
    HIGH_UTILIZATION_PCT: 80,
    MEDIUM_UTILIZATION_PCT: 60,
    OVERSPEND_ACCELERATION_BOOST: 15,
  },
  BURNOUT: {
    INTENSE_FOCUS_MINUTES_PER_DAY: 300, // 5 hours
    CRITICAL_CONSECUTIVE_DAYS: 4,
    HIGH_CONSECUTIVE_DAYS: 2,
    LATE_NIGHT_START_HOUR: 23,
    LATE_NIGHT_END_HOUR: 4,
    CRITICAL_LATE_NIGHT_SESSIONS: 5,
    HIGH_LATE_NIGHT_SESSIONS: 3,
  },
  OVERDUE_TASKS: {
    CRITICAL_OVERDUE_COUNT: 5,
    HIGH_OVERDUE_COUNT: 3,
    IMMINENT_DEADLINE_HOURS: 24,
  },
  SAVINGS: {
    DEADLINE_WARNING_DAYS: 30,
    MIN_PROGRESS_RATIO: 0.50,
  },
  OVERALL_RISK_LEVELS: {
    CRITICAL_SCORE: 80,
    HIGH_SCORE: 60,
    MEDIUM_SCORE: 35,
    LOW_SCORE: 15,
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// Rule Evaluation Thresholds
// ═══════════════════════════════════════════════════════════════

export const RULE_THRESHOLDS = {
  FOCUS_BELOW_AVG_RATIO: 0.80, // < 80% of weekly average
  TASK_COMPLETION_LOW_PCT: 60, // < 60% completion rate
  BUDGET_LIKELY_EXCEED_RATIO: 0.95, // Projected spend >= 95% of budget
  FOCUS_IMPROVEMENT_GROWTH_PCT: 15, // >= 15% focus growth
  CONSISTENCY_IMPROVEMENT_PCT: 70, // >= 70% days with min focus
  OVERDUE_TASK_LIMIT: 3,
  WEEKEND_SPEND_SPIKE_RATIO: 1.8, // Weekend spending >= 1.8x weekday
  SAVINGS_PROGRESS_MIN_PCT: 10,
  STRONG_MOMENTUM_SCORE: 75,
  EXCELLENT_WELLNESS_SCORE: 80,
  DEFAULT_DAILY_FOCUS_GOAL: 120,
  DEFAULT_TASK_GOAL: 6,
  DEFAULT_MONTHLY_BUDGET: 10000,
} as const;

// ═══════════════════════════════════════════════════════════════
// UI & Theme Mapping Defaults
// ═══════════════════════════════════════════════════════════════

export const GRADE_THRESHOLDS = {
  A_PLUS: 95,
  A: 85,
  B: 70,
  C: 50,
} as const;

export const GRADE_COLORS = {
  A_PLUS: '#10b981',
  A: '#10b981',
  B: '#06b6d4',
  C: '#f59e0b',
  F: '#ef4444',
} as const;

export const CATEGORY_EMOJIS: Readonly<Record<CoachCategory, string>> = {
  productivity: '⚡',
  finance: '💰',
  focus: '⏱️',
  tasks: '✅',
  habits: '🔄',
  streak: '🔥',
  savings: '🐷',
  wellness: '🧘',
};
