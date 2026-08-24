/**
 * CoachMetricRow — Two-column metric display row
 *
 * Displays a label-value pair with optional icon, trend indicator, and badge.
 * Designed to be composed vertically within CoachCard or CoachSummaryCard.
 *
 * @example
 * ```tsx
 * <CoachMetricRow label="Focus Time" value="2h 30m" icon="⏱️" trend="improving" />
 * <CoachMetricRow label="Tasks Done" value="8/12" badge={<CoachBadge priority="medium" />} />
 * ```
 *
 * Future consumers: Dashboard, Analytics, Reports
 *
 * @module components/coach/CoachMetricRow
 */

import React, { memo, type ReactNode } from 'react';
import type { TrendDirection } from '../../lib/coach/coachTypes';

// ═══════════════════════════════════════════════════════════════
// Trend Indicator
// ═══════════════════════════════════════════════════════════════

const TREND_CONFIG: Record<TrendDirection, { arrow: string; color: string; label: string }> = {
  improving: { arrow: '↑', color: 'text-semantic-success', label: 'Improving' },
  declining: { arrow: '↓', color: 'text-semantic-danger', label: 'Declining' },
  stable: { arrow: '→', color: 'text-text-muted', label: 'Stable' },
};

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface CoachMetricRowProps {
  /** Metric label (left side) */
  label: string;
  /** Metric value (right side) */
  value: string | number;
  /** Optional emoji icon before the label */
  icon?: string;
  /** Optional trend direction indicator */
  trend?: TrendDirection;
  /** Optional badge element (e.g., CoachBadge) displayed after value */
  badge?: ReactNode;
  /** Additional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

const CoachMetricRow = memo(function CoachMetricRow({
  label,
  value,
  icon,
  trend,
  badge,
  className = '',
}: CoachMetricRowProps) {
  const trendInfo = trend ? TREND_CONFIG[trend] : null;

  return (
    <div
      className={`flex items-center justify-between gap-3 py-2 ${className}`}
      role="listitem"
    >
      {/* Left: icon + label */}
      <div className="flex items-center gap-2 min-w-0">
        {icon && (
          <span className="text-sm shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="text-sm text-text-secondary truncate">{label}</span>
      </div>

      {/* Right: value + trend + badge */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-semibold text-text-primary tabular-nums">
          {value}
        </span>
        {trendInfo && (
          <span
            className={`text-xs font-medium ${trendInfo.color}`}
            aria-label={trendInfo.label}
            title={trendInfo.label}
          >
            {trendInfo.arrow}
          </span>
        )}
        {badge}
      </div>
    </div>
  );
});

export default CoachMetricRow;
