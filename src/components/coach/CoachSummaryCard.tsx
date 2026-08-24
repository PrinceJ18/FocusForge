/**
 * CoachSummaryCard — Multi-purpose card for briefs and reviews
 *
 * Displays a heading, short summary, bullet points list, optional score
 * circle, and optional icon. Used for daily briefs, evening reviews,
 * weekly/monthly review summaries.
 *
 * @example
 * ```tsx
 * <CoachSummaryCard
 *   heading="Morning Brief"
 *   icon="☀️"
 *   summary="You have 3 high-priority tasks today."
 *   points={["Focus goal: 120m", "Budget remaining: ₹500", "Streak: 7 days"]}
 *   score={82}
 *   grade="A"
 * />
 * ```
 *
 * Future consumers: Dashboard, Analytics, Reports
 *
 * @module components/coach/CoachSummaryCard
 */

import React, { memo } from 'react';
import type { CoachCardVariant } from './CoachCard';
import CoachCard from './CoachCard';

// ═══════════════════════════════════════════════════════════════
// Grade color mapping (consistent with reports engine)
// ═══════════════════════════════════════════════════════════════

function getGradeColor(grade: string): string {
  if (grade === 'A+' || grade === 'A') return '#10b981';
  if (grade === 'B') return '#06b6d4';
  if (grade === 'C') return '#f59e0b';
  return '#ef4444';
}

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface CoachSummaryCardProps {
  /** Card heading */
  heading: string;
  /** Emoji icon */
  icon?: string;
  /** Short summary text */
  summary?: string;
  /** Bullet points list */
  points?: readonly string[];
  /** Optional score (0–100) — rendered as a circular indicator */
  score?: number;
  /** Optional grade letter (e.g., "A+") */
  grade?: string;
  /** Card variant */
  variant?: CoachCardVariant;
  /** Optional footer content */
  footer?: React.ReactNode;
  /** Additional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

const CoachSummaryCard = memo(function CoachSummaryCard({
  heading,
  icon,
  summary,
  points,
  score,
  grade,
  variant = 'default',
  footer,
  className = '',
}: CoachSummaryCardProps) {
  const gradeColor = grade ? getGradeColor(grade) : '#a855f7';

  return (
    <CoachCard
      title={heading}
      icon={icon}
      variant={variant}
      footer={footer}
      ariaLabel={`Summary: ${heading}${score !== undefined ? `, score ${score}` : ''}`}
      className={className}
    >
      <div className="flex items-start gap-4">
        {/* Score circle (optional) */}
        {score !== undefined && (
          <div className="shrink-0 flex flex-col items-center gap-1">
            <div
              className="
                w-14 h-14 rounded-full
                flex items-center justify-center
                border-2 font-bold text-lg tabular-nums
                transition-colors duration-normal
              "
              style={{
                borderColor: gradeColor,
                color: gradeColor,
              }}
              role="img"
              aria-label={`Score: ${score}${grade ? `, grade ${grade}` : ''}`}
            >
              {grade ?? score}
            </div>
            {grade && score !== undefined && (
              <span className="text-[10px] text-text-muted tabular-nums">{score}%</span>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {summary && (
            <p className="text-sm text-text-secondary leading-relaxed mb-2">
              {summary}
            </p>
          )}

          {points && points.length > 0 && (
            <ul className="space-y-1.5" role="list">
              {points.map((point, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-text-secondary leading-relaxed"
                >
                  <span className="text-primary mt-0.5 shrink-0" aria-hidden="true">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </CoachCard>
  );
});

export default CoachSummaryCard;
