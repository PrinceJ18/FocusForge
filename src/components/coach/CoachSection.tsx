/**
 * CoachSection — Section wrapper for grouping coach content
 *
 * Provides consistent spacing and layout matching existing Dashboard section
 * conventions (density-padding, density-gap). Accepts a title, subtitle,
 * actions slot, and children.
 *
 * @example
 * ```tsx
 * <CoachSection
 *   title="Recommendations"
 *   subtitle="Based on your recent activity"
 *   actions={<Button size="sm">View All</Button>}
 * >
 *   <CoachRecommendationCard ... />
 * </CoachSection>
 * ```
 *
 * Future consumers: Dashboard, Analytics, Reports
 *
 * @module components/coach/CoachSection
 */

import React, { memo, type ReactNode } from 'react';

export interface CoachSectionProps {
  /** Section title */
  title: string;
  /** Optional subtitle / description */
  subtitle?: string;
  /** Optional action buttons displayed in the header (right side) */
  actions?: ReactNode;
  /** Section body content */
  children: ReactNode;
  /** Additional className */
  className?: string;
}

const CoachSection = memo(function CoachSection({
  title,
  subtitle,
  actions,
  children,
  className = '',
}: CoachSectionProps) {
  return (
    <section
      className={`space-y-4 ${className}`}
      aria-labelledby={`coach-section-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2
            id={`coach-section-${title.toLowerCase().replace(/\s+/g, '-')}`}
            className="font-space font-bold text-base text-text-primary"
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Section Body */}
      <div className="grid gap-3">
        {children}
      </div>
    </section>
  );
});

export default CoachSection;
