/**
 * Coach UI Component Library — Public API
 *
 * Barrel re-export for all coach UI components.
 * Import everything from 'components/coach'.
 *
 * @example
 * ```tsx
 * import {
 *   CoachCard,
 *   CoachSection,
 *   CoachBadge,
 *   CoachRecommendationCard,
 *   CoachRiskCard,
 *   CoachPredictionCard,
 *   CoachSummaryCard,
 *   CoachMetricRow,
 *   CoachEmptyState,
 * } from '../components/coach';
 * ```
 *
 * @module components/coach
 */

// Layout primitives
export { default as CoachCard } from './CoachCard';
export type { CoachCardProps, CoachCardVariant } from './CoachCard';

export { default as CoachSection } from './CoachSection';
export type { CoachSectionProps } from './CoachSection';

// Data display components
export { default as CoachBadge } from './CoachBadge';
export type { CoachBadgeProps } from './CoachBadge';

export { default as CoachMetricRow } from './CoachMetricRow';
export type { CoachMetricRowProps } from './CoachMetricRow';

// Composite cards
export { default as CoachRecommendationCard } from './CoachRecommendationCard';
export type { CoachRecommendationCardProps } from './CoachRecommendationCard';

export { default as CoachRiskCard } from './CoachRiskCard';
export type { CoachRiskCardProps } from './CoachRiskCard';

export { default as CoachPredictionCard } from './CoachPredictionCard';
export type { CoachPredictionCardProps } from './CoachPredictionCard';

export { default as CoachSummaryCard } from './CoachSummaryCard';
export type { CoachSummaryCardProps } from './CoachSummaryCard';

// States
export { default as CoachEmptyState } from './CoachEmptyState';
export type { CoachEmptyStateProps } from './CoachEmptyState';
