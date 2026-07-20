import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

// ============================================================
// KpiCard — Premium KPI metric card component
// ============================================================
// Purpose-built for dashboard KPI widgets with:
//   - Large primary value with premium typography
//   - Descriptive subtitle
//   - Tinted icon well
//   - Optional trend indicator (up/down)
//   - Optional animated progress bar
//   - Optional SVG circular progress ring
//   - Optional status badge
//   - Subtle hover lift + shadow transition
// ============================================================

interface KpiCardProps {
  /** Lucide icon component */
  icon: LucideIcon;
  /** Subtitle label below the value */
  title: string;
  /** Large primary metric value */
  value: string | number;
  /** Color for the primary value */
  valueColor?: string;
  /** Icon well background color */
  iconBg?: string;
  /** Icon color */
  iconColor?: string;
  /** Optional trend indicator */
  trend?: { direction: 'up' | 'down'; label: string };
  /** Optional linear progress bar */
  progressBar?: { value: number; max: number; color?: string; gradient?: string };
  /** Optional circular progress ring */
  progressRing?: { value: number; max: number; color?: string; size?: number };
  /** Optional status badge */
  badge?: { label: string; color: string };
  /** Small helper text below progress */
  footer?: string;
  /** Grid column span */
  colSpan?: number;
  /** Optional background gradient */
  gradient?: string;
  /** Click handler */
  onClick?: () => void;
}

/** SVG-based circular progress ring */
function ProgressRing({
  value,
  max,
  color = '#a855f7',
  size = 52,
}: {
  value: number;
  max: number;
  color?: string;
  size?: number;
}) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(Math.max(value, 0), max);
  const progress = max > 0 ? clampedValue / max : 0;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="kpi-card__ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
            transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </svg>
      {/* Center value */}
      <div
        className="kpi-card__ring-value"
        style={{ color }}
      >
        {Math.round(progress * 100)}%
      </div>
    </div>
  );
}

export default function KpiCard({
  icon: Icon,
  title,
  value,
  valueColor,
  iconBg = 'rgba(168,85,247,0.12)',
  iconColor = '#a855f7',
  trend,
  progressBar,
  progressRing,
  badge,
  footer,
  colSpan,
  gradient,
  onClick,
}: KpiCardProps) {
  const colStyle: React.CSSProperties = colSpan
    ? { gridColumn: `span ${colSpan}` }
    : {};

  const bgStyle: React.CSSProperties = gradient
    ? { background: gradient }
    : {};

  return (
    <div
      className="kpi-card"
      style={{ ...colStyle, ...bgStyle }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Top row: icon + badge + trend */}
      <div className="kpi-card__header">
        <div className="kpi-card__icon" style={{ background: iconBg, color: iconColor }}>
          <Icon size={18} />
        </div>

        <div className="kpi-card__header-right">
          {badge && (
            <span
              className="kpi-card__badge"
              style={{
                background: `${badge.color}18`,
                color: badge.color,
                borderColor: `${badge.color}30`,
              }}
            >
              {badge.label}
            </span>
          )}
          {trend && (
            <span
              className="kpi-card__trend"
              style={{ color: trend.direction === 'up' ? '#10b981' : '#ef4444' }}
            >
              {trend.direction === 'up' ? (
                <ArrowUpRight size={14} />
              ) : (
                <ArrowDownRight size={14} />
              )}
              <span>{trend.label}</span>
            </span>
          )}
        </div>
      </div>

      {/* Center: value + ring side-by-side */}
      <div className="kpi-card__body">
        <div className="kpi-card__metrics">
          <div
            className="kpi-card__value"
            style={valueColor ? { color: valueColor } : {}}
          >
            {value}
          </div>
          <div className="kpi-card__subtitle">{title}</div>
        </div>

        {progressRing && (
          <ProgressRing
            value={progressRing.value}
            max={progressRing.max}
            color={progressRing.color}
            size={progressRing.size}
          />
        )}
      </div>

      {/* Progress bar */}
      {progressBar && (
        <div className="kpi-card__progress-track">
          <div
            className="kpi-card__progress-fill"
            style={{
              width: `${Math.min(100, progressBar.max > 0 ? (progressBar.value / progressBar.max) * 100 : 0)}%`,
              background: progressBar.gradient || progressBar.color || 'var(--accent-gradient)',
            }}
          />
        </div>
      )}

      {/* Footer */}
      {footer && <div className="kpi-card__footer">{footer}</div>}
    </div>
  );
}
