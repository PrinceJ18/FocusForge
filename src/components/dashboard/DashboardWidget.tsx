import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

// ============================================================
// DashboardWidget — Reusable widget card component
// ============================================================
// Every dashboard card MUST use this component.
// This is the single source of truth for all card styling.
//
// Sizes:
//   kpi    — 120px fixed height (stat counters)
//   medium — 320px fixed height (charts, lists)
//   large  — 420px fixed height (task boards, goals)
//   hero   — auto height (welcome banners)
//
// When `scrollable` is true, the body content scrolls
// internally while the header stays fixed.
// ============================================================

type WidgetSize = 'kpi' | 'medium' | 'large' | 'hero';

interface DashboardWidgetProps {
  /** Header icon (lucide-react icon component) */
  icon: LucideIcon;
  /** Widget title */
  title: string;
  /** Widget body content */
  children: ReactNode;
  /** Optional count badge next to title */
  badge?: string | number;
  /** Optional action buttons in header */
  headerAction?: ReactNode;
  /** Optional footer content */
  footer?: ReactNode;
  /** Controls fixed height tier */
  size?: WidgetSize;
  /** Enable internal body scrolling */
  scrollable?: boolean;
  /** Grid column span (1-12, responsive) */
  colSpan?: number;
  /** Optional background gradient override */
  gradient?: string;
  /** Additional className passthrough */
  className?: string;
  /** Icon background color override */
  iconBg?: string;
  /** Icon color override */
  iconColor?: string;
}

/** Maps colSpan to the CSS `grid-column: span X` value */
function getColSpanStyle(colSpan?: number): React.CSSProperties {
  if (!colSpan || colSpan <= 1) return {};
  return { gridColumn: `span ${colSpan}` };
}

/** Maps size to the appropriate CSS modifier class */
function getSizeClass(size?: WidgetSize): string {
  if (!size) return '';
  return `dashboard-widget--${size}`;
}

export default function DashboardWidget({
  icon: Icon,
  title,
  children,
  badge,
  headerAction,
  footer,
  size,
  scrollable = false,
  colSpan,
  gradient,
  className = '',
  iconBg,
  iconColor,
}: DashboardWidgetProps) {
  const sizeClass = getSizeClass(size);

  const widgetStyle: React.CSSProperties = {
    ...getColSpanStyle(colSpan),
    ...(gradient ? { background: gradient } : {}),
  };

  return (
    <div
      className={`dashboard-widget ${sizeClass} ${className}`.trim()}
      style={widgetStyle}
    >
      {/* Header */}
      <div className="dashboard-widget-header">
        <div className="dashboard-widget-header__left">
          <div
            className="dashboard-widget-header__icon"
            style={{
              ...(iconBg ? { background: iconBg } : {}),
              ...(iconColor ? { color: iconColor } : {}),
            }}
          >
            <Icon size={18} />
          </div>
          <span className="dashboard-widget-header__title">{title}</span>
          {badge !== undefined && badge !== null && (
            <span className="dashboard-widget-header__badge">{badge}</span>
          )}
        </div>
        {headerAction && (
          <div className="dashboard-widget-header__actions">
            {headerAction}
          </div>
        )}
      </div>

      {/* Body */}
      <div
        className={`dashboard-widget-body ${scrollable ? 'dashboard-widget-body--scrollable' : ''}`}
      >
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className="dashboard-widget-footer">
          {footer}
        </div>
      )}
    </div>
  );
}
