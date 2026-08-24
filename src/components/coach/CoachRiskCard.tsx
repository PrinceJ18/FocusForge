/**
 * CoachRiskCard — Displays a single risk assessment item
 *
 * Renders a CoachRiskItem from the coach engine with severity indicator,
 * title, description, threshold metric, and suggested action.
 * Critical risks get a pulsing left accent border for urgency.
 *
 * @example
 * ```tsx
 * <CoachRiskCard risk={engine.generateRiskAssessment()[0]} />
 * ```
 *
 * Future consumers: Dashboard (risk alert banner), Notification Center
 *
 * @module components/coach/CoachRiskCard
 */

import React, { memo } from 'react';
import type { CoachRiskItem } from '../../lib/coach/coachTypes';
import CoachCard from './CoachCard';
import CoachBadge from './CoachBadge';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface CoachRiskCardProps {
  /** The risk item data from the coach engine */
  risk: CoachRiskItem;
  /** Optional callback when the card is clicked for details */
  onClick?: () => void;
  /** Additional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

const CoachRiskCard = memo(function CoachRiskCard({
  risk,
  onClick,
  className = '',
}: CoachRiskCardProps) {
  const { icon, title, description, severity, category, threshold } = risk;

  // Threshold progress (how far past the limit)
  const thresholdPct = threshold.limit > 0
    ? Math.min(100, Math.round((threshold.actual / threshold.limit) * 100))
    : 0;

  const Wrapper = onClick ? 'button' : 'div';
  const wrapperProps = onClick
    ? {
        onClick,
        type: 'button' as const,
        'aria-label': `View details: ${title}`,
        className: 'w-full text-left cursor-pointer',
      }
    : {};

  return (
    <CoachCard
      priority={severity}
      ariaLabel={`${severity} risk: ${title}`}
      className={`${className}`}
    >
      <Wrapper {...wrapperProps}>
        {/* Header with icon + title + severity badge */}
        <div className="flex items-start gap-3">
          <span className="text-lg shrink-0 mt-0.5" aria-hidden="true">
            {icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className="font-space font-semibold text-sm text-text-primary">
                {title}
              </h4>
              <CoachBadge priority={severity} />
              <CoachBadge category={category} />
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              {description}
            </p>

            {/* Threshold metric bar */}
            {threshold.label !== 'N/A' && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-text-muted">{threshold.label}</span>
                  <span className="text-[10px] text-text-muted tabular-nums">
                    {threshold.actual} / {threshold.limit} {threshold.unit}
                  </span>
                </div>
                <div className="h-1.5 bg-border/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-slow"
                    style={{
                      width: `${thresholdPct}%`,
                      backgroundColor: risk.color,
                    }}
                    role="progressbar"
                    aria-valuenow={threshold.actual}
                    aria-valuemax={threshold.limit}
                    aria-label={`${threshold.label}: ${threshold.actual} of ${threshold.limit} ${threshold.unit}`}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </Wrapper>
    </CoachCard>
  );
});

export default CoachRiskCard;
