import type { ReactNode } from 'react';

// ============================================================
// DashboardGrid — Responsive 12-column grid wrapper
// ============================================================
// Desktop (≥1280px): 12 columns
// Tablet  (≥768px):  6 columns
// Mobile  (<768px):  1 column
//
// Uses the `.dashboard-grid` CSS class from index.css.
// All spacing is controlled by `var(--density-gap)`.
// ============================================================

interface DashboardGridProps {
  children: ReactNode;
  className?: string;
}

export default function DashboardGrid({ children, className = '' }: DashboardGridProps) {
  return (
    <div className={`dashboard-grid ${className}`.trim()}>
      {children}
    </div>
  );
}
