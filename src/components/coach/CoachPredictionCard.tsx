/**
 * CoachPredictionCard — Displays a single prediction metric
 *
 * Shows current value, predicted value, confidence level, trend indicator,
 * and prediction timeframe. Designed for metrics like monthly focus,
 * spending projections, and score predictions.
 *
 * @example
 * ```tsx
 * <CoachPredictionCard
 *   label="Monthly Focus"
 *   currentValue="24h"
 *   predictedValue="36h"
 *   confidence="high"
 *   trend="improving"
 *   timeframe="End of August"
 *   icon="⏱️"
 * />
 * ```
 *
 * Future consumers: Analytics (predictions panel), Dashboard (forecast widgets)
 *
 * @module components/coach/CoachPredictionCard
 */

import React, { memo } from 'react';
import type { TrendDirection } from '../../lib/coach/coachTypes';
import CoachCard from './CoachCard';
import CoachBadge from './CoachBadge';

// ═══════════════════════════════════════════════════════════════
// Trend arrows
// ═══════════════════════════════════════════════════════════════

const TREND_ARROW: Record<TrendDirection, { symbol: string; color: string }> = {
  improving: { symbol: '▲', color: 'text-semantic-success' },
  declining: { symbol: '▼', color: 'text-semantic-danger' },
  stable: { symbol: '▸', color: 'text-text-muted' },
};

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface CoachPredictionCardProps {
  /** Metric name (e.g., "Monthly Focus") */
  label: string;
  /** Current value display string (e.g., "24h 30m") */
  currentValue: string;
  /** Predicted value display string (e.g., "36h 0m") */
  predictedValue: string;
  /** Prediction confidence level */
  confidence: 'high' | 'medium' | 'low';
  /** Trend direction */
  trend?: TrendDirection;
  /** Prediction timeframe label (e.g., "End of August") */
  timeframe?: string;
  /** Emoji icon */
  icon?: string;
  /** Additional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

const CoachPredictionCard = memo(function CoachPredictionCard({
  label,
  currentValue,
  predictedValue,
  confidence,
  trend,
  timeframe,
  icon,
  className = '',
}: CoachPredictionCardProps) {
  const trendInfo = trend ? TREND_ARROW[trend] : null;

  return (
    <CoachCard
      ariaLabel={`Prediction: ${label} — current ${currentValue}, predicted ${predictedValue}`}
      className={className}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        {icon && (
          <span className="text-lg shrink-0 mt-0.5" aria-hidden="true">
            {icon}
          </span>
        )}

        <div className="flex-1 min-w-0">
          {/* Label + badges */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="font-space font-semibold text-sm text-text-primary">
              {label}
            </span>
            <CoachBadge confidence={confidence} />
            {trend && <CoachBadge trend={trend} />}
          </div>

          {/* Current → Predicted values */}
          <div className="flex items-center gap-3">
            {/* Current */}
            <div className="text-center">
              <p className="text-[10px] text-text-muted uppercase tracking-wide mb-0.5">
                Current
              </p>
              <p className="text-lg font-bold text-text-primary tabular-nums">
                {currentValue}
              </p>
            </div>

            {/* Arrow */}
            <div className="flex items-center gap-1 px-2" aria-hidden="true">
              <div className="w-8 h-px bg-border" />
              {trendInfo ? (
                <span className={`text-sm font-bold ${trendInfo.color}`}>
                  {trendInfo.symbol}
                </span>
              ) : (
                <span className="text-sm text-text-muted">→</span>
              )}
              <div className="w-8 h-px bg-border" />
            </div>

            {/* Predicted */}
            <div className="text-center">
              <p className="text-[10px] text-text-muted uppercase tracking-wide mb-0.5">
                Predicted
              </p>
              <p className="text-lg font-bold text-primary tabular-nums">
                {predictedValue}
              </p>
            </div>
          </div>

          {/* Timeframe */}
          {timeframe && (
            <p className="text-[10px] text-text-muted mt-2">
              📅 {timeframe}
            </p>
          )}
        </div>
      </div>
    </CoachCard>
  );
});

export default CoachPredictionCard;
