/**
 * CoachBadge — Smart badge for coach data types
 *
 * Maps CoachPriority, CoachCategory, confidence levels, and TrendDirection
 * to existing Badge component variants automatically. This is a pure mapping
 * layer — no new visual styles are introduced.
 *
 * @example
 * ```tsx
 * <CoachBadge priority="critical" />
 * <CoachBadge category="focus" />
 * <CoachBadge confidence="high" />
 * <CoachBadge trend="improving" />
 * ```
 *
 * Future consumers: Dashboard, Analytics, Reports, Notification Center
 *
 * @module components/coach/CoachBadge
 */

import React, { memo } from 'react';
import Badge, { type BadgeProps } from '../ui/Badge';
import type { CoachPriority, CoachCategory, TrendDirection } from '../../lib/coach/coachTypes';

// ═══════════════════════════════════════════════════════════════
// Mapping Tables
// ═══════════════════════════════════════════════════════════════

const PRIORITY_VARIANT: Record<CoachPriority, BadgeProps['variant']> = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'default',
  info: 'success',
};

const PRIORITY_LABEL: Record<CoachPriority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
};

const CATEGORY_VARIANT: Record<CoachCategory, BadgeProps['variant']> = {
  productivity: 'purple',
  finance: 'warning',
  focus: 'purple',
  tasks: 'info',
  habits: 'success',
  streak: 'warning',
  savings: 'success',
  wellness: 'info',
};

const CATEGORY_LABEL: Record<CoachCategory, string> = {
  productivity: 'Productivity',
  finance: 'Finance',
  focus: 'Focus',
  tasks: 'Tasks',
  habits: 'Habits',
  streak: 'Streak',
  savings: 'Savings',
  wellness: 'Wellness',
};

const CONFIDENCE_VARIANT: Record<string, BadgeProps['variant']> = {
  high: 'success',
  medium: 'warning',
  low: 'default',
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high: 'High Confidence',
  medium: 'Medium Confidence',
  low: 'Low Confidence',
};

const TREND_VARIANT: Record<TrendDirection, BadgeProps['variant']> = {
  improving: 'success',
  declining: 'danger',
  stable: 'default',
};

const TREND_LABEL: Record<TrendDirection, string> = {
  improving: '↑ Improving',
  declining: '↓ Declining',
  stable: '→ Stable',
};

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export interface CoachBadgeProps {
  /** Display a priority badge */
  priority?: CoachPriority;
  /** Display a category badge */
  category?: CoachCategory;
  /** Display a confidence badge */
  confidence?: 'high' | 'medium' | 'low';
  /** Display a trend badge */
  trend?: TrendDirection;
  /** Badge size */
  size?: 'sm' | 'md';
  /** Additional className */
  className?: string;
}

/**
 * Smart badge that maps coach data types to existing Badge variants.
 *
 * Exactly one of `priority`, `category`, `confidence`, or `trend` should be
 * provided. If multiple are given, priority takes precedence in that order.
 */
const CoachBadge = memo(function CoachBadge({
  priority,
  category,
  confidence,
  trend,
  size = 'sm',
  className = '',
}: CoachBadgeProps) {
  let variant: BadgeProps['variant'] = 'default';
  let label = '';

  if (priority) {
    variant = PRIORITY_VARIANT[priority];
    label = PRIORITY_LABEL[priority];
  } else if (category) {
    variant = CATEGORY_VARIANT[category];
    label = CATEGORY_LABEL[category];
  } else if (confidence) {
    variant = CONFIDENCE_VARIANT[confidence] ?? 'default';
    label = CONFIDENCE_LABEL[confidence] ?? confidence;
  } else if (trend) {
    variant = TREND_VARIANT[trend];
    label = TREND_LABEL[trend];
  }

  if (!label) return null;

  return (
    <Badge
      variant={variant}
      size={size}
      className={className}
      role="status"
      aria-label={label}
    >
      {label}
    </Badge>
  );
});

export default CoachBadge;
