/**
 * Analytics AI Coach Intelligence Layer (Phase 3.10C)
 *
 * Provides dedicated, accessible, and reactive intelligence blocks that interpret
 * existing Analytics charts and metrics using the FocusForge AI Coach backend.
 *
 * Consumes data EXCLUSIVELY via `useCoach()` with zero duplicate calculations.
 *
 * Components:
 * 1. AnalyticsIntelligentSummary — 4 top-level insight cards (Improvement, Decline, Best Habit, Opportunity)
 * 2. ChartInsightPanel — Compact one-line AI interpretation banner below charts
 * 3. AnalyticsPredictionsSummary — Compact 4-card deterministic forecast grid
 * 4. AnalyticsRiskOverview — Interactive risk cards (max 3) with expandable why/probability/action
 * 5. AnalyticsBehaviourSummary — 4 habit facets (Best Day, Best Hour, Weekend Dynamics, Consistency Score)
 * 6. AnalyticsTimeline — Latest 5 chronological events from the Coach timeline
 *
 * @module components/analytics/AnalyticsCoachInsights
 */

import React, { memo, useState } from 'react';
import {
  Brain,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Target,
  Award,
  Calendar,
  Clock,
  Zap,
  CheckCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Activity,
  Flame,
  Wallet,
  Timer,
  AlertTriangle,
} from 'lucide-react';
import type { UseCoachReturn } from '../../hooks/useCoach';
import type { CoachPriority, CoachRiskItem, CoachTimelineEvent } from '../../lib/coach/coachTypes';

// ═══════════════════════════════════════════════════════════════
// 1. SECTION 1: ANALYTICS SUMMARY (4 TOP-LEVEL CARDS)
// ═══════════════════════════════════════════════════════════════

export interface AnalyticsIntelligentSummaryProps {
  coach: UseCoachReturn;
}

export const AnalyticsIntelligentSummary: React.FC<AnalyticsIntelligentSummaryProps> = memo(
  function AnalyticsIntelligentSummary({ coach }) {
    const { weeklyReview, habits, recommendations, earlyRisks, dailyBrief } = coach;

    // 1. Strongest Improvement
    const strongestImprovement =
      weeklyReview?.wins?.[0]?.description ||
      (dailyBrief?.yesterdaySummary
        ? dailyBrief.yesterdaySummary
        : 'Focus endurance is scaling consistently across work sessions.');

    // 2. Biggest Friction / Decline Point
    const biggestDecline =
      weeklyReview?.improvements?.[0]?.description ||
      (earlyRisks?.topCriticalRisks?.[0]?.description ??
        'Weekend expenditures occasionally outpace weekday budget thresholds.');

    // 3. Best Habit Discovered
    const bestHabit = habits
      ? `Peak cadence on ${habits.bestWeekday.dayName}s with prime focus at ${habits.bestFocusHour.timeWindow}.`
      : 'Morning work blocks yield the lowest distraction rate.';

    // 4. Biggest Opportunity
    const biggestOpportunity =
      recommendations[0]?.title ||
      habits?.procrastinationPatterns.patternSummary ||
      'Complete high-priority backlog tasks early in the daily cycle.';

    const summaryCards = [
      {
        icon: TrendingUp,
        label: 'Strongest Improvement',
        content: strongestImprovement,
        color: '#10b981',
        bg: 'rgba(16,185,129,0.06)',
        border: 'rgba(16,185,129,0.18)',
      },
      {
        icon: TrendingDown,
        label: 'Primary Friction Point',
        content: biggestDecline,
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.06)',
        border: 'rgba(245,158,11,0.18)',
      },
      {
        icon: Award,
        label: 'Discovered Habit Pattern',
        content: bestHabit,
        color: '#06b6d4',
        bg: 'rgba(6,182,212,0.06)',
        border: 'rgba(6,182,212,0.18)',
      },
      {
        icon: Target,
        label: 'Highest Leverage Opportunity',
        content: biggestOpportunity,
        color: '#a855f7',
        bg: 'rgba(168,85,247,0.06)',
        border: 'rgba(168,85,247,0.18)',
      },
    ];

    return (
      <div className="space-y-3 pt-2" role="region" aria-label="Intelligent Insights Summary">
        <div className="flex items-center justify-between">
          <div className="section-header mb-0">
            <div
              className="section-header-icon"
              style={{ background: 'linear-gradient(135deg, #a855f7, #06b6d4)' }}
            >
              <Brain size={16} className="text-text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Intelligent Insights</h3>
              <p className="text-[11px] text-text-muted">
                AI explanations based on your analytics trends.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {summaryCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className="p-4 rounded-xl border flex flex-col justify-between transition-all hover:scale-[1.01]"
                style={{ backgroundColor: card.bg, borderColor: card.border }}
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${card.color}20`, color: card.color }}
                    >
                      <Icon size={14} />
                    </div>
                    <span
                      className="text-[10px] uppercase font-bold tracking-wider truncate"
                      style={{ color: card.color }}
                    >
                      {card.label}
                    </span>
                  </div>
                  <p className="text-xs text-text-primary leading-relaxed line-clamp-3">
                    {card.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

// ═══════════════════════════════════════════════════════════════
// 2. SECTION 2: CHART INSIGHT PANEL
// ═══════════════════════════════════════════════════════════════

export interface ChartInsightPanelProps {
  insightText: string;
  category?: 'focus' | 'finance' | 'tasks' | 'consistency';
  className?: string;
}

export const ChartInsightPanel: React.FC<ChartInsightPanelProps> = memo(function ChartInsightPanel({
  insightText,
  category = 'focus',
  className = '',
}) {
  if (!insightText) return null;

  const colorMap = {
    focus: { text: 'text-purple-400', border: 'border-purple-500/20', bg: 'bg-purple-950/20' },
    finance: { text: 'text-pink-400', border: 'border-pink-500/20', bg: 'bg-pink-950/20' },
    tasks: { text: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-950/20' },
    consistency: { text: 'text-cyan-400', border: 'border-cyan-500/20', bg: 'bg-cyan-950/20' },
  };

  const currentTheme = colorMap[category] ?? colorMap.focus;

  return (
    <div
      className={`px-3.5 py-2.5 rounded-xl border flex items-center gap-2.5 text-xs text-text-secondary ${currentTheme.bg} ${currentTheme.border} ${className}`}
      role="note"
      aria-label="AI Chart Insight"
    >
      <div className={`p-1 rounded-md bg-background-card-hover shrink-0 ${currentTheme.text}`}>
        <Sparkles size={13} />
      </div>
      <div className="flex-1 min-w-0">
        <span className={`font-bold mr-1.5 uppercase text-[10px] tracking-wider ${currentTheme.text}`}>
          AI Insight:
        </span>
        <span className="leading-snug">{insightText}</span>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════
// 3. SECTION 3: PREDICTION SUMMARY (4 COMPACT CARDS)
// ═══════════════════════════════════════════════════════════════

export interface AnalyticsPredictionsSummaryProps {
  coach: UseCoachReturn;
}

export const AnalyticsPredictionsSummary: React.FC<AnalyticsPredictionsSummaryProps> = memo(
  function AnalyticsPredictionsSummary({ coach }) {
    const { predictions } = coach;
    if (!predictions) return null;

    return (
      <div className="glass-card p-5 space-y-4" role="region" aria-label="Predictions Summary">
        <div className="flex items-center justify-between">
          <div className="section-header mb-0">
            <div
              className="section-header-icon"
              style={{ background: 'rgba(168,85,247,0.15)' }}
            >
              <Zap size={16} style={{ color: '#a855f7' }} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Predictions</h3>
              <p className="text-[11px] text-text-muted">
                Deterministic run-rate forecasts based on active velocity.
              </p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold text-purple-400 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">
            {predictions.confidence} Confidence
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Expected Productivity */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-border text-center flex flex-col justify-center">
            <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1">
              Expected Productivity
            </span>
            <div className="text-lg font-black text-purple-400 font-space">
              {predictions.expectedProductivityScore}/100
            </div>
            <span className="text-[10px] text-text-muted mt-0.5">Estimated Score</span>
          </div>

          {/* Expected Weekly Grade */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-border text-center flex flex-col justify-center">
            <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1">
              Expected Weekly Grade
            </span>
            <div className="text-lg font-black text-cyan-400 font-space">
              {predictions.expectedWeeklyGrade || 'A'}
            </div>
            <span className="text-[10px] text-text-muted mt-0.5">Pace Trajectory</span>
          </div>

          {/* Budget Runway */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-border text-center flex flex-col justify-center">
            <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1">
              Budget Runway
            </span>
            <div className="text-lg font-black text-emerald-400 font-space">
              {predictions.daysUntilBudgetDepleted !== null && predictions.daysUntilBudgetDepleted !== undefined
                ? `${predictions.daysUntilBudgetDepleted}d remaining`
                : 'Safe Limit'}
            </div>
            <span className="text-[10px] text-text-muted mt-0.5">Depletion Estimate</span>
          </div>

          {/* Momentum */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-border text-center flex flex-col justify-center">
            <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1">
              Momentum
            </span>
            <div className="text-lg font-black text-pink-400 font-space">
              {predictions.focusMomentumFactor
                ? `${Math.round(predictions.focusMomentumFactor * 100)}% pace`
                : `${Math.round(predictions.expectedMonthlyFocusMinutes / 60)}h total`}
            </div>
            <span className="text-[10px] text-text-muted mt-0.5">Velocity Factor</span>
          </div>
        </div>
      </div>
    );
  }
);

// ═══════════════════════════════════════════════════════════════
// 4. SECTION 4: RISK OVERVIEW (MAX 3 WITH EXPANSION)
// ═══════════════════════════════════════════════════════════════

export interface AnalyticsRiskOverviewProps {
  coach: UseCoachReturn;
}

export const AnalyticsRiskOverview: React.FC<AnalyticsRiskOverviewProps> = memo(
  function AnalyticsRiskOverview({ coach }) {
    const { riskAssessment } = coach;
    const [expandedRiskId, setExpandedRiskId] = useState<string | null>(null);

    const activeRisks = riskAssessment.slice(0, 3);

    const toggleRisk = (id: string) => {
      setExpandedRiskId(prev => (prev === id ? null : id));
    };

    return (
      <div className="glass-card p-5 space-y-4" role="region" aria-label="Risk Overview">
        <div className="flex items-center justify-between">
          <div className="section-header mb-0">
            <div
              className="section-header-icon"
              style={{ background: 'rgba(239,68,68,0.15)' }}
            >
              <ShieldAlert size={16} style={{ color: '#ef4444' }} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Early Risk Overview</h3>
              <p className="text-[11px] text-text-muted">
                Proactive risk mitigation analyzed by the Early Risk Engine.
              </p>
            </div>
          </div>
          <span className="text-[10px] text-text-muted font-semibold">
            {activeRisks.length} active
          </span>
        </div>

        <div className="space-y-2.5">
          {activeRisks.length > 0 ? (
            activeRisks.map((risk) => {
              const isExpanded = expandedRiskId === risk.id;
              const isCritical = risk.severity === 'critical';
              const isHigh = risk.severity === 'high';

              const severityColor = isCritical
                ? 'text-red-400 bg-red-500/10 border-red-500/25'
                : isHigh
                ? 'text-amber-400 bg-amber-500/10 border-amber-500/25'
                : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25';

              return (
                <div
                  key={risk.id}
                  className="rounded-xl border border-border bg-white/[0.02] overflow-hidden transition-all"
                >
                  <button
                    onClick={() => toggleRisk(risk.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`risk-details-${risk.id}`}
                    className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-base shrink-0">{risk.icon}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-bold text-text-primary truncate">{risk.title}</h5>
                          <span
                            className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full border ${severityColor}`}
                          >
                            {risk.severity}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-secondary truncate mt-0.5">
                          {risk.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-text-muted">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </button>

                  {/* EXPANDED RISK DETAILS */}
                  {isExpanded && (
                    <div
                      id={`risk-details-${risk.id}`}
                      className="p-4 bg-slate-900/90 border-t border-border space-y-2 text-xs animate-fadeIn"
                    >
                      <div className="grid grid-cols-2 gap-2 text-[11px] pb-2 border-b border-border">
                        <div>
                          <span className="text-text-muted block">Severity Tier:</span>
                          <span className="font-bold text-red-400 capitalize">{risk.severity}</span>
                        </div>
                        <div>
                          <span className="text-text-muted block">Probability:</span>
                          <span className="font-bold text-amber-400 capitalize">{risk.probability || 'High'}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-text-muted block mb-0.5">
                          Causal Factor
                        </span>
                        <p className="text-text-primary leading-relaxed">{risk.description}</p>
                      </div>

                      {risk.suggestedAction && (
                        <div className="pt-2 border-t border-border">
                          <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">
                            Suggested Action
                          </span>
                          <p className="text-slate-100 font-semibold">{risk.suggestedAction}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-3">
              <CheckCircle size={18} className="text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-emerald-400 block">All Systems Optimal</span>
                <span className="text-[11px] text-text-muted">
                  Zero critical performance or financial risks detected.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

// ═══════════════════════════════════════════════════════════════
// 5. SECTION 5: BEHAVIOUR SUMMARY
// ═══════════════════════════════════════════════════════════════

export interface AnalyticsBehaviourSummaryProps {
  coach: UseCoachReturn;
}

export const AnalyticsBehaviourSummary: React.FC<AnalyticsBehaviourSummaryProps> = memo(
  function AnalyticsBehaviourSummary({ coach }) {
    const { habits } = coach;
    if (!habits) return null;

    const habitCards = [
      {
        icon: Calendar,
        label: 'Best Weekday',
        value: habits.bestWeekday.dayName,
        sub: `${habits.bestWeekday.avgFocusMinutes}m average focus`,
        color: '#a855f7',
      },
      {
        icon: Clock,
        label: 'Best Focus Hour',
        value: habits.bestFocusHour.timeWindow,
        sub: 'Highest flow-state block',
        color: '#06b6d4',
      },
      {
        icon: Wallet,
        label: 'Weekend Dynamics',
        value: `${habits.weekendBehaviour.spendRatioWeekendToWeekday}x Weekday Spend`,
        sub: habits.weekendBehaviour.pattern === 'high_spending_weekend' ? 'Weekend spending surge' : 'Balanced spending',
        color: habits.weekendBehaviour.pattern === 'high_spending_weekend' ? '#f59e0b' : '#10b981',
      },
      {
        icon: Flame,
        label: 'Consistency Score',
        value: `${habits.consistencyScore}%`,
        sub: 'Habit adherence rating',
        color: '#ec4899',
      },
    ];

    return (
      <div className="glass-card p-5 space-y-4" role="region" aria-label="Behaviour Summary">
        <div className="section-header mb-0">
          <div
            className="section-header-icon"
            style={{ background: 'rgba(6,182,212,0.15)' }}
          >
            <Activity size={16} style={{ color: '#06b6d4' }} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Behaviour & Habit Dynamics</h3>
            <p className="text-[11px] text-text-muted">
              Discovered patterns across focus windows, weekday trends, and weekend variance.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {habitCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-white/[0.02] border border-border text-center flex flex-col justify-between"
              >
                <div>
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center mx-auto mb-2"
                    style={{ backgroundColor: `${card.color}15`, color: card.color }}
                  >
                    <Icon size={14} />
                  </div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold block mb-0.5">
                    {card.label}
                  </span>
                  <div
                    className="text-sm font-bold truncate"
                    style={{ color: card.color, fontFamily: 'Space Grotesk' }}
                  >
                    {card.value}
                  </div>
                </div>
                <span className="text-[10px] text-text-muted mt-1 block truncate">{card.sub}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

// ═══════════════════════════════════════════════════════════════
// 6. SECTION 6: TIMELINE (LATEST 5 EVENTS)
// ═══════════════════════════════════════════════════════════════

export interface AnalyticsTimelineProps {
  coach: UseCoachReturn;
}

export const AnalyticsTimeline: React.FC<AnalyticsTimelineProps> = memo(function AnalyticsTimeline({
  coach,
}) {
  const { timeline } = coach;
  const recentEvents = timeline.slice(0, 5);

  if (recentEvents.length === 0) return null;

  return (
    <div className="glass-card p-5 space-y-4" role="region" aria-label="Coach Timeline">
      <div className="section-header mb-0">
        <div
          className="section-header-icon"
          style={{ background: 'rgba(168,85,247,0.15)' }}
        >
          <Clock size={16} style={{ color: '#a855f7' }} />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-100">Intelligence Timeline</h3>
          <p className="text-[11px] text-text-muted">
            Chronological log of milestones, trend shifts, and risk detections.
          </p>
        </div>
      </div>

      <div className="space-y-3 relative pl-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-background-card-hover">
        {recentEvents.map((evt) => (
          <div key={evt.id} className="relative flex items-start gap-3 text-xs">
            <div className="w-3 h-3 rounded-full bg-purple-500/40 border border-purple-400 shrink-0 mt-0.5 -ml-[19px]" />
            <div className="flex-1 min-w-0 bg-white/[0.02] border border-border p-3 rounded-xl">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-bold text-text-primary truncate">{evt.title}</span>
                <span className="text-[10px] text-text-muted shrink-0">{evt.timestamp}</span>
              </div>
              <p className="text-text-secondary text-[11px] leading-relaxed">{evt.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
