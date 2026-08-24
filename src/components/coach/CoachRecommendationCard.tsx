/**
 * CoachRecommendationCard — Displays a single coach recommendation
 *
 * Renders a CoachRecommendation from the coach engine with icon, title,
 * description, priority badge, category badge, and optional CTA button.
 *
 * Supports all five priority levels (critical, high, medium, low, info)
 * with appropriate visual treatment via CoachCard's accent strip.
 *
 * @example
 * ```tsx
 * <CoachRecommendationCard
 *   recommendation={engine.generateRecommendations()[0]}
 *   onAction={() => navigateTo('focus')}
 * />
 * ```
 *
 * Future consumers: Dashboard, Analytics, Reports, Notification Center
 *
 * @module components/coach/CoachRecommendationCard
 */

import React, { memo } from 'react';
import type { CoachRecommendation } from '../../lib/coach/coachTypes';
import CoachCard from './CoachCard';
import CoachBadge from './CoachBadge';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface CoachRecommendationCardProps {
  /** The recommendation data from the coach engine */
  recommendation: CoachRecommendation;
  /** Optional callback when the action CTA is clicked */
  onAction?: () => void;
  /** Optional custom CTA label (defaults to "Take Action") */
  actionLabel?: string;
  /** Additional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

const CoachRecommendationCard = memo(function CoachRecommendationCard({
  recommendation,
  onAction,
  actionLabel = 'Take Action',
  className = '',
}: CoachRecommendationCardProps) {
  const { icon, title, description, action, priority, category, metric } = recommendation;

  return (
    <CoachCard
      priority={priority}
      ariaLabel={`${priority} recommendation: ${title}`}
      className={className}
      footer={onAction ? (
        <button
          onClick={onAction}
          className="
            text-xs font-medium text-primary
            hover:text-primary-secondary
            transition-colors duration-normal
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:rounded-sm
          "
          aria-label={`${actionLabel} — ${title}`}
        >
          {actionLabel} →
        </button>
      ) : undefined}
    >
      {/* Header row with icon + title + badges */}
      <div className="flex items-start gap-3">
        <span className="text-lg shrink-0 mt-0.5" aria-hidden="true">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="font-space font-semibold text-sm text-text-primary">
              {title}
            </h4>
            <CoachBadge priority={priority} />
            <CoachBadge category={category} />
          </div>
          <p className="text-xs text-text-secondary leading-relaxed mb-2">
            {description}
          </p>
          <p className="text-xs text-text-muted italic">
            💡 {action}
          </p>

          {/* Optional metric context */}
          {metric && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-border/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-slow"
                  style={{
                    width: `${Math.min(100, Math.max(0, (metric.current / Math.max(1, metric.threshold)) * 100))}%`,
                    backgroundColor: recommendation.color,
                  }}
                  role="progressbar"
                  aria-valuenow={metric.current}
                  aria-valuemax={metric.threshold}
                  aria-label={`${metric.label}: ${metric.current} of ${metric.threshold} ${metric.unit}`}
                />
              </div>
              <span className="text-[10px] text-text-muted whitespace-nowrap tabular-nums">
                {metric.current} / {metric.threshold} {metric.unit}
              </span>
            </div>
          )}
        </div>
      </div>
    </CoachCard>
  );
});

export default CoachRecommendationCard;
