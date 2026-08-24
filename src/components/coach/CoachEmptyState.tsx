/**
 * CoachEmptyState — Coach-specific empty state placeholder
 *
 * Wraps the existing EmptyState component with coach-specific defaults.
 * Accepts a `variant` to auto-select appropriate message, icon, and
 * description for different coach contexts.
 *
 * @example
 * ```tsx
 * <CoachEmptyState variant="focus" />
 * <CoachEmptyState variant="general" />
 * <CoachEmptyState
 *   variant="custom"
 *   title="No predictions yet"
 *   description="We need a few more days of data."
 * />
 * ```
 *
 * Future consumers: Dashboard, Analytics, Reports
 *
 * @module components/coach/CoachEmptyState
 */

import React, { memo } from 'react';
import { Brain, Timer, CheckSquare, Wallet, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// Variant Presets
// ═══════════════════════════════════════════════════════════════

interface EmptyPreset {
  icon: LucideIcon;
  title: string;
  description: string;
}

const PRESETS: Record<string, EmptyPreset> = {
  focus: {
    icon: Timer,
    title: 'Focus data needed',
    description: 'Complete a few focus sessions to unlock coaching insights for your productivity.',
  },
  tasks: {
    icon: CheckSquare,
    title: 'Task data needed',
    description: 'Finish some tasks to generate productivity recommendations and trends.',
  },
  finance: {
    icon: Wallet,
    title: 'Spending data needed',
    description: 'Track expenses for a few days to receive spending insights and predictions.',
  },
  general: {
    icon: Brain,
    title: 'Building your coaching profile',
    description: 'Complete focus sessions, finish tasks, and log expenses to unlock AI coaching.',
  },
};

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface CoachEmptyStateProps {
  /** Preset variant for auto-selecting message/icon */
  variant?: 'focus' | 'tasks' | 'finance' | 'general' | 'custom';
  /** Custom title (used when variant is 'custom' or to override preset) */
  title?: string;
  /** Custom description (used when variant is 'custom' or to override preset) */
  description?: string;
  /** Custom icon (used when variant is 'custom') */
  icon?: LucideIcon;
  /** Additional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

const CoachEmptyState = memo(function CoachEmptyState({
  variant = 'general',
  title,
  description,
  icon,
  className = '',
}: CoachEmptyStateProps) {
  const preset = variant !== 'custom' ? PRESETS[variant] ?? PRESETS.general : null;
  const Icon = icon ?? preset?.icon ?? Sparkles;
  const resolvedTitle = title ?? preset?.title ?? 'No data available';
  const resolvedDescription = description ?? preset?.description ?? 'More activity is needed.';

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center space-y-4 rounded-card border border-dashed border-border bg-background-card/30 ${className}`}
      role="status"
      aria-label={resolvedTitle}
    >
      <div className="h-12 w-12 rounded-full bg-background-card border border-border flex items-center justify-center text-text-muted mb-2">
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-lg font-semibold text-text-primary">{resolvedTitle}</h3>
        <p className="text-sm text-text-muted">{resolvedDescription}</p>
      </div>
    </div>
  );
});

export default CoachEmptyState;
