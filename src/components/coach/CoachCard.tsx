/**
 * CoachCard — Generic glass card wrapper for coach content
 *
 * Follows the existing FocusForge glass card design (backdrop-blur, border,
 * hover transitions) with an optional priority-colored left accent strip.
 *
 * Variants map to semantic colors:
 * - default: neutral border
 * - success: green accent (info/positive)
 * - warning: amber accent (medium/caution)
 * - danger: red accent (critical/high)
 * - info: cyan accent (informational)
 *
 * @example
 * ```tsx
 * <CoachCard title="Morning Brief" icon="☀️" priority="info">
 *   <p>Good morning!</p>
 * </CoachCard>
 * ```
 *
 * Future consumers: Dashboard, Analytics, Reports, Notification Center
 *
 * @module components/coach/CoachCard
 */

import React, { memo, type ReactNode } from 'react';
import type { CoachPriority } from '../../lib/coach/coachTypes';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export type CoachCardVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface CoachCardProps {
  /** Card title displayed in the header */
  title?: string;
  /** Emoji icon displayed next to the title */
  icon?: string;
  /** Priority level — auto-maps to variant if variant is not explicitly set */
  priority?: CoachPriority;
  /** Explicit variant override (takes precedence over priority mapping) */
  variant?: CoachCardVariant;
  /** Card body content */
  children: ReactNode;
  /** Optional footer content */
  footer?: ReactNode;
  /** Show loading shimmer state */
  loading?: boolean;
  /** Show empty state (renders children as empty placeholder) */
  empty?: boolean;
  /** Additional className */
  className?: string;
  /** ARIA label override (defaults to title) */
  ariaLabel?: string;
}

// ═══════════════════════════════════════════════════════════════
// Variant Mapping
// ═══════════════════════════════════════════════════════════════

const PRIORITY_TO_VARIANT: Record<CoachPriority, CoachCardVariant> = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'default',
  info: 'success',
};

/** Left accent border color per variant */
const ACCENT_COLORS: Record<CoachCardVariant, string> = {
  default: 'transparent',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  info: 'var(--color-info)',
};

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

const CoachCard = memo(function CoachCard({
  title,
  icon,
  priority,
  variant,
  children,
  footer,
  loading = false,
  empty = false,
  className = '',
  ariaLabel,
}: CoachCardProps) {
  const resolvedVariant = variant ?? (priority ? PRIORITY_TO_VARIANT[priority] : 'default');
  const accentColor = ACCENT_COLORS[resolvedVariant];
  const hasAccent = resolvedVariant !== 'default';

  return (
    <div
      className={`
        relative overflow-hidden
        bg-background-card backdrop-blur-xl
        border border-border rounded-card
        shadow-elevation1
        transition-all duration-normal
        hover:bg-background-card-hover hover:-translate-y-px
        hover:shadow-elevation2
        focus-within:ring-2 focus-within:ring-primary/30 focus-within:ring-offset-0
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      role="region"
      aria-label={ariaLabel ?? title ?? 'Coach card'}
    >
      {/* Left accent strip */}
      {hasAccent && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-card"
          style={{ backgroundColor: accentColor }}
          aria-hidden="true"
        />
      )}

      {/* Header */}
      {title && (
        <div className="flex items-center gap-2.5 px-5 pt-4 pb-0 shrink-0">
          {icon && (
            <span className="text-base leading-none shrink-0" aria-hidden="true">
              {icon}
            </span>
          )}
          <h3 className="font-space font-bold text-[13px] text-text-primary whitespace-nowrap overflow-hidden text-ellipsis">
            {title}
          </h3>
        </div>
      )}

      {/* Body */}
      <div className={`px-5 py-4 ${empty ? 'opacity-60' : ''}`}>
        {loading ? (
          <div className="space-y-3 animate-pulse" aria-label="Loading coach content">
            <div className="h-3 bg-border/50 rounded-md w-3/4" />
            <div className="h-3 bg-border/50 rounded-md w-1/2" />
            <div className="h-3 bg-border/50 rounded-md w-5/6" />
          </div>
        ) : (
          children
        )}
      </div>

      {/* Footer */}
      {footer && !loading && (
        <div className="px-5 pb-4 pt-0 border-t border-border/50 mt-auto">
          <div className="pt-3">
            {footer}
          </div>
        </div>
      )}
    </div>
  );
});

export default CoachCard;
