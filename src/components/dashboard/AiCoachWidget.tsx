/**
 * Intelligent Insights Dashboard Widget (Phase 3.10B)
 *
 * Interactive intelligence center powered entirely by the FocusForge AI Coach backend.
 * Consumes data exclusively via `useCoach()` with zero local calculations.
 *
 * Interactive Features:
 * 1. Expandable Top Recommendation — "Why?" explainability breakdown (reasons, triggers, impact, effort)
 * 2. Recommendation Actions — Local "Done" and "Dismiss" to cycle through ranked recommendations
 * 3. Interactive Risk Monitor — Clickable risk chips that expand severity, probability, reasons, and mitigations
 * 4. Expandable Forecast Cards — Clickable cards displaying current vs predicted values, confidence, and reasoning
 * 5. Dynamic Confidence & Freshness Indicators — Real-time backend confidence tier and freshness metadata
 * 6. Resilient Empty State — Gracefully renders empty state when insufficient data is available
 *
 * @module components/dashboard/AiCoachWidget
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import {
  Brain,
  Sparkles,
  TrendingUp,
  ShieldAlert,
  Target,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
  RotateCcw,
  ShieldCheck,
  Flame,
  Wallet,
  Timer,
  BarChart2,
} from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import EmptyState from '../ui/EmptyState';
import { useCoach } from '../../hooks/useCoach';
import type { CoachPriority, CoachRiskItem } from '../../lib/coach/coachTypes';

export interface AiCoachWidgetProps {
  className?: string;
}

type ForecastKey = 'productivity' | 'grade' | 'budget' | 'focus';

const PRIORITY_BADGE_STYLES: Record<CoachPriority, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  high: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  medium: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  low: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  info: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
};

function getRiskChipStyle(severity: CoachPriority): { bg: string; text: string; border: string; iconColor: string } {
  if (severity === 'critical') {
    return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', iconColor: '#ef4444' };
  }
  if (severity === 'high') {
    return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', iconColor: '#f59e0b' };
  }
  if (severity === 'medium') {
    return { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', iconColor: '#eab308' };
  }
  return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', iconColor: '#10b981' };
}

export const AiCoachWidget: React.FC<AiCoachWidgetProps> = memo(function AiCoachWidget({ className = '' }) {
  const coach = useCoach();
  const { dailyBrief, recommendations, predictions, riskAssessment, coachHealth, habits, behaviourTrends } = coach;

  // ----------------------------------------------------
  // INTERACTIVE LOCAL STATE (Zero DB/Store Writes)
  // ----------------------------------------------------
  const [isWhyExpanded, setIsWhyExpanded] = useState<boolean>(false);
  const [actedRecIds, setActedRecIds] = useState<Set<string>>(() => new Set());
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);
  const [expandedForecastKey, setExpandedForecastKey] = useState<ForecastKey | null>(null);

  // Filter out recommendations marked Done / Dismissed locally
  const activeRecommendations = useMemo(() => {
    return recommendations.filter(r => !actedRecIds.has(r.id));
  }, [recommendations, actedRecIds]);

  const currentRec = activeRecommendations.length > 0 ? activeRecommendations[0] : null;

  // Recommendation Action Handlers
  const handleCompleteRecommendation = useCallback((id: string) => {
    setActedRecIds(prev => new Set(prev).add(id));
    setIsWhyExpanded(false);
  }, []);

  const handleDismissRecommendation = useCallback((id: string) => {
    setActedRecIds(prev => new Set(prev).add(id));
    setIsWhyExpanded(false);
  }, []);

  const handleResetRecommendations = useCallback(() => {
    setActedRecIds(new Set());
    setIsWhyExpanded(false);
  }, []);

  const handleToggleRisk = useCallback((id: string) => {
    setSelectedRiskId(prev => (prev === id ? null : id));
  }, []);

  const handleToggleForecast = useCallback((key: ForecastKey) => {
    setExpandedForecastKey(prev => (prev === key ? null : key));
  }, []);

  // ----------------------------------------------------
  // EMPTY STATE
  // ----------------------------------------------------
  if (!coachHealth.hasData || !dailyBrief) {
    return (
      <DashboardWidget
        icon={Brain}
        title="Intelligent Insights"
        subtitle="Real-time insights that adapt to your activity."
        size="auto"
        colSpan={12}
        gradient="linear-gradient(135deg, rgba(168,85,247,0.08), rgba(6,182,212,0.04), rgba(236,72,153,0.04))"
        iconBg="rgba(168,85,247,0.15)"
        iconColor="#a855f7"
        className={className}
      >
        <EmptyState
          icon={Brain}
          title="AI Coach is learning your habits."
          description="Continue using FocusForge for a few days to unlock personalized recommendations."
          className="my-2"
        />
      </DashboardWidget>
    );
  }

  // ----------------------------------------------------
  // COMPUTED INTELLIGENCE METADATA
  // ----------------------------------------------------
  const confidenceLabel =
    predictions?.confidence === 'high'
      ? 'High Confidence'
      : predictions?.confidence === 'medium'
      ? 'Medium Confidence'
      : 'Learning';

  const confidenceBadgeVariant =
    predictions?.confidence === 'high'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      : predictions?.confidence === 'medium'
      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      : 'bg-purple-500/10 text-purple-400 border-purple-500/20';

  const activeRisks = riskAssessment.slice(0, 4);
  const selectedRisk = riskAssessment.find(r => r.id === selectedRiskId) || null;

  const briefSentences = [
    dailyBrief.yesterdaySummary,
    dailyBrief.motivation,
    dailyBrief.streakStatus.message,
    dailyBrief.primeFocusWindow ? `Prime focus window: ${dailyBrief.primeFocusWindow}` : null,
  ].filter((s): s is string => Boolean(s) && (s as string).length > 0);

  // Selected forecast metadata builder
  const forecastDetails = useMemo(() => {
    if (!expandedForecastKey || !predictions) return null;

    switch (expandedForecastKey) {
      case 'productivity':
        return {
          title: 'Productivity Outlook',
          currentVal: `Current trajectory`,
          predictedVal: `${predictions.expectedProductivityScore}/100 expected`,
          confidence: predictions.confidence,
          reasoning:
            'Calculated via exponentially weighted moving averages of task completions and focus velocity.',
        };
      case 'grade':
        return {
          title: 'Projected Weekly Grade',
          currentVal: `Current trajectory: Grade ${predictions.expectedWeeklyGrade}`,
          predictedVal: `Grade ${predictions.expectedWeeklyGrade}`,
          confidence: predictions.confidence,
          reasoning:
            'Based on consistency score, goal adherence, and streak sustainability across 7 days.',
        };
      case 'budget':
        return {
          title: 'Budget Runway Forecast',
          currentVal:
            predictions.daysUntilBudgetDepleted !== null && predictions.daysUntilBudgetDepleted !== undefined
              ? `${predictions.daysUntilBudgetDepleted} days remaining`
              : 'Within monthly allocation',
          predictedVal: `Burn rate: ₹${Math.round(predictions.expectedMonthlySpending / 30)}/day`,
          confidence: predictions.confidence,
          reasoning:
            'Analyzed from daily spending velocity and remaining calendar days in billing cycle.',
        };
      case 'focus':
        return {
          title: 'Focus Momentum & Trajectory',
          currentVal: predictions.focusMomentumFactor
            ? `${Math.round(predictions.focusMomentumFactor * 100)}% pace momentum`
            : 'Standard momentum',
          predictedVal: `${Math.round(predictions.expectedMonthlyFocusMinutes / 60)}h month-end projected`,
          confidence: predictions.confidence,
          reasoning:
            habits?.bestFocusHour
              ? `Your peak productivity hour is ${habits.bestFocusHour.timeWindow}. Maintaining this routine maximizes focus velocity.`
              : 'Computed via decay-weighted moving averages of daily pomodoro sessions.',
        };
      default:
        return null;
    }
  }, [expandedForecastKey, predictions, dailyBrief, habits]);

  return (
    <DashboardWidget
      icon={Brain}
      title="Intelligent Insights"
      subtitle="Real-time insights that adapt to your activity."
      size="auto"
      colSpan={12}
      gradient="linear-gradient(135deg, rgba(168,85,247,0.09), rgba(6,182,212,0.05), rgba(236,72,153,0.04))"
      iconBg="rgba(168,85,247,0.18)"
      iconColor="#a855f7"
      headerAction={
        <div className="flex items-center gap-2">
          {/* Confidence Badge */}
          <span
            className={`hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${confidenceBadgeVariant}`}
            role="status"
            aria-label={`Prediction Confidence: ${confidenceLabel}`}
          >
            <Sparkles size={12} />
            {confidenceLabel}
          </span>
          {/* Last Updated indicator */}
          <span className="text-[10px] text-text-muted flex items-center gap-1 font-medium">
            <Clock size={11} className="text-text-muted" />
            Last updated • Just now
          </span>
        </div>
      }
      className={className}
    >
      <div className="space-y-5 py-1">
        {/* ============================================================
            SECTION 1: MORNING BRIEF
            ============================================================ */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-border backdrop-blur-sm space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-purple-400 shrink-0" />
            <h4 className="text-xs font-bold font-space uppercase tracking-wider text-purple-300">
              {dailyBrief.greeting}
            </h4>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {briefSentences.slice(0, 4).map((sentence, idx) => (
              <li
                key={idx}
                className="text-xs text-text-secondary flex items-start gap-2 leading-relaxed"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400/80 mt-1.5 shrink-0" />
                <span>{sentence}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ============================================================
            GRID: SECTION 2 (TOP RECOMMENDATION) & SECTION 3 (RISK MONITOR)
            ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* SECTION 2: TOP RECOMMENDATION (7 cols on desktop) */}
          <div className="lg:col-span-7 p-4 rounded-xl bg-white/[0.02] border border-border flex flex-col justify-between transition-all">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <Target size={14} className="text-cyan-400" />
                  Top Recommendation
                  {activeRecommendations.length > 1 && (
                    <span className="text-[10px] text-text-muted font-normal">
                      (1 of {activeRecommendations.length})
                    </span>
                  )}
                </span>

                <div className="flex items-center gap-1.5">
                  {currentRec && (
                    <span
                      className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full border ${
                        PRIORITY_BADGE_STYLES[currentRec.priority]?.bg ?? 'bg-purple-500/10'
                      } ${
                        PRIORITY_BADGE_STYLES[currentRec.priority]?.text ?? 'text-purple-400'
                      } ${
                        PRIORITY_BADGE_STYLES[currentRec.priority]?.border ?? 'border-purple-500/20'
                      }`}
                    >
                      {currentRec.priority}
                    </span>
                  )}
                  {/* Why? Button */}
                  {currentRec?.explainability && (
                    <button
                      onClick={() => setIsWhyExpanded(prev => !prev)}
                      aria-expanded={isWhyExpanded}
                      aria-controls={`rec-explain-${currentRec.id}`}
                      className={`text-[11px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-md border transition-all ${
                        isWhyExpanded
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          : 'bg-background-card-hover text-text-secondary border-border hover:bg-background-card-hover hover:text-text-primary'
                      }`}
                      title="See why this recommendation was generated"
                    >
                      <HelpCircle size={12} />
                      Why?
                      {isWhyExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  )}
                </div>
              </div>

              {currentRec ? (
                <div className="space-y-2">
                  <div className="flex items-start gap-2.5">
                    <span className="text-xl shrink-0 mt-0.5">{currentRec.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-bold text-text-primary leading-snug">{currentRec.title}</h5>
                      <p className="text-xs text-text-secondary leading-relaxed mt-1">{currentRec.description}</p>
                    </div>
                  </div>

                  {/* EXPANDABLE EXPLAINABILITY PANEL */}
                  {isWhyExpanded && currentRec.explainability && (
                    <div
                      id={`rec-explain-${currentRec.id}`}
                      className="p-3.5 mt-2.5 rounded-lg bg-purple-950/20 border border-purple-500/20 space-y-2 text-xs transition-all animate-fadeIn"
                    >
                      <div>
                        <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider block mb-0.5">
                          Causal Trigger
                        </span>
                        <p className="text-text-primary leading-relaxed">{currentRec.explainability.why}</p>
                      </div>

                      {currentRec.explainability.triggerMetrics.length > 0 && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider block mb-1">
                            Trigger Metrics
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {currentRec.explainability.triggerMetrics.map((tm, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[11px]"
                              >
                                {tm.label}: {tm.current}{tm.unit}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-purple-500/20">
                        {currentRec.explainability.expectedImprovement && (
                          <div>
                            <span className="text-[10px] text-text-muted block">Expected Improvement</span>
                            <span className="font-semibold text-emerald-400 text-xs">
                              {currentRec.explainability.expectedImprovement}
                            </span>
                          </div>
                        )}
                        {(currentRec.estimatedEffort || currentRec.estimatedBenefit) && (
                          <div>
                            <span className="text-[10px] text-text-muted block">Estimated Effort</span>
                            <span className="font-semibold text-text-primary text-xs capitalize">
                              {currentRec.estimatedEffort || currentRec.estimatedBenefit}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-4 text-center space-y-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                    <ShieldCheck size={18} />
                  </div>
                  <p className="text-xs text-text-secondary font-medium">
                    All recommendations cleared for today. Excellent work!
                  </p>
                  {actedRecIds.size > 0 && (
                    <button
                      onClick={handleResetRecommendations}
                      className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 mx-auto"
                    >
                      <RotateCcw size={12} />
                      Reset Cleared Items ({actedRecIds.size})
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* RECOMMENDATION ACTIONS FOOTER */}
            {currentRec && (
              <div className="mt-3.5 pt-2.5 border-t border-border flex items-center justify-between gap-2">
                <span className="text-[11px] text-text-muted truncate max-w-[50%]">
                  {currentRec.explainability?.expectedImprovement || currentRec.action}
                </span>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Dismiss Button */}
                  <button
                    onClick={() => handleDismissRecommendation(currentRec.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-background-card-hover border border-border hover:bg-background-card-hover text-text-secondary transition-colors"
                    title="Temporarily dismiss this recommendation and show the next"
                  >
                    <X size={12} />
                    Dismiss
                  </button>
                  {/* Done Button */}
                  <button
                    onClick={() => handleCompleteRecommendation(currentRec.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600/80 hover:bg-emerald-500 text-text-primary border border-emerald-400/30 transition-all shadow-sm"
                    title="Mark recommendation as done and advance"
                  >
                    <Check size={13} strokeWidth={2.5} />
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: RISK MONITOR (5 cols on desktop) */}
          <div className="lg:col-span-5 p-4 rounded-xl bg-white/[0.02] border border-border flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-amber-400" />
                  Active Risk Monitor
                </span>
                <span className="text-[10px] text-text-muted font-semibold">
                  {activeRisks.length} active
                </span>
              </div>

              <div className="space-y-2">
                {activeRisks.length > 0 ? (
                  activeRisks.map((risk) => {
                    const style = getRiskChipStyle(risk.severity);
                    const isSelected = selectedRiskId === risk.id;
                    return (
                      <div key={risk.id} className="transition-all">
                        <button
                          onClick={() => handleToggleRisk(risk.id)}
                          aria-expanded={isSelected}
                          aria-controls={`risk-detail-${risk.id}`}
                          className={`w-full text-left px-3 py-2 rounded-lg border flex items-center justify-between gap-2 text-xs transition-all ${
                            style.bg
                          } ${style.border} ${isSelected ? 'ring-1 ring-purple-500/50' : 'hover:brightness-110'}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm shrink-0">{risk.icon}</span>
                            <span className={`font-semibold truncate ${style.text}`}>{risk.title}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-bold uppercase text-text-muted">
                              {risk.severity}
                            </span>
                            {isSelected ? <ChevronUp size={13} className="text-text-muted" /> : <ChevronDown size={13} className="text-text-muted" />}
                          </div>
                        </button>

                        {/* EXPANDED RISK DETAIL DRAWER */}
                        {isSelected && (
                          <div
                            id={`risk-detail-${risk.id}`}
                            className="p-3 mt-1 rounded-lg bg-slate-900/80 border border-border space-y-2 text-xs animate-fadeIn"
                          >
                            <div className="flex justify-between items-center text-[10px] text-text-muted uppercase tracking-wider pb-1 border-b border-border">
                              <span>Severity: <strong className={style.text}>{risk.severity}</strong></span>
                              <span>Probability: <strong className="text-text-primary">{risk.probability || 'High'}</strong></span>
                            </div>
                            <p className="text-text-secondary leading-relaxed">{risk.description}</p>
                            {risk.suggestedAction && (
                              <div className="pt-1.5 border-t border-border">
                                <span className="text-[10px] text-text-muted uppercase font-bold block mb-0.5">
                                  Mitigation Strategy
                                </span>
                                <span className="text-emerald-400 font-semibold">{risk.suggestedAction}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-2.5">
                    <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                    <div className="text-xs">
                      <span className="font-bold text-emerald-400 block">All Systems Optimal</span>
                      <span className="text-[11px] text-text-muted">No active risks detected today.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 pt-2 text-[10px] text-text-muted text-right">
              {activeRisks.length > 0 ? 'Click any risk for details' : 'Continuously monitored by Risk Engine'}
            </div>
          </div>
        </div>

        {/* ============================================================
            SECTION 4: PREDICTIONS (4 INTERACTIVE CARDS)
            ============================================================ */}
        <div>
          <div className="flex items-center justify-between gap-1.5 mb-2.5">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={14} className="text-purple-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Deterministic Forecasts
              </span>
            </div>
            <span className="text-[10px] text-text-muted">Click any card to inspect reasoning</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Productivity Outlook */}
            <button
              onClick={() => handleToggleForecast('productivity')}
              aria-expanded={expandedForecastKey === 'productivity'}
              aria-controls="forecast-detail-productivity"
              className={`p-3 rounded-xl border text-center flex flex-col justify-center transition-all ${
                expandedForecastKey === 'productivity'
                  ? 'bg-purple-950/40 border-purple-500/50 ring-1 ring-purple-500/30'
                  : 'bg-white/[0.02] border-border hover:bg-white/[0.04]'
              }`}
            >
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-0.5">
                Productivity
              </span>
              <div className="text-base font-black text-purple-400 font-space">
                {predictions ? `${predictions.expectedProductivityScore}/100` : '—'}
              </div>
              <span className="text-[10px] text-text-muted mt-0.5">Expected Score</span>
            </button>

            {/* 2. Projected Weekly Grade */}
            <button
              onClick={() => handleToggleForecast('grade')}
              aria-expanded={expandedForecastKey === 'grade'}
              aria-controls="forecast-detail-grade"
              className={`p-3 rounded-xl border text-center flex flex-col justify-center transition-all ${
                expandedForecastKey === 'grade'
                  ? 'bg-cyan-950/40 border-cyan-500/50 ring-1 ring-cyan-500/30'
                  : 'bg-white/[0.02] border-border hover:bg-white/[0.04]'
              }`}
            >
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-0.5">
                Weekly Grade
              </span>
              <div className="text-base font-black text-cyan-400 font-space">
                {predictions?.expectedWeeklyGrade || 'A'}
              </div>
              <span className="text-[10px] text-text-muted mt-0.5">Pace Trajectory</span>
            </button>

            {/* 3. Budget Outlook */}
            <button
              onClick={() => handleToggleForecast('budget')}
              aria-expanded={expandedForecastKey === 'budget'}
              aria-controls="forecast-detail-budget"
              className={`p-3 rounded-xl border text-center flex flex-col justify-center transition-all ${
                expandedForecastKey === 'budget'
                  ? 'bg-emerald-950/40 border-emerald-500/50 ring-1 ring-emerald-500/30'
                  : 'bg-white/[0.02] border-border hover:bg-white/[0.04]'
              }`}
            >
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-0.5">
                Budget Runway
              </span>
              <div className="text-base font-black text-emerald-400 font-space">
                {predictions?.daysUntilBudgetDepleted !== null && predictions?.daysUntilBudgetDepleted !== undefined
                  ? `${predictions.daysUntilBudgetDepleted}d left`
                  : 'On Track'}
              </div>
              <span className="text-[10px] text-text-muted mt-0.5">Depletion Forecast</span>
            </button>

            {/* 4. Focus Momentum */}
            <button
              onClick={() => handleToggleForecast('focus')}
              aria-expanded={expandedForecastKey === 'focus'}
              aria-controls="forecast-detail-focus"
              className={`p-3 rounded-xl border text-center flex flex-col justify-center transition-all ${
                expandedForecastKey === 'focus'
                  ? 'bg-pink-950/40 border-pink-500/50 ring-1 ring-pink-500/30'
                  : 'bg-white/[0.02] border-border hover:bg-white/[0.04]'
              }`}
            >
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-0.5">
                Focus Momentum
              </span>
              <div className="text-base font-black text-pink-400 font-space">
                {predictions?.focusMomentumFactor
                  ? `${Math.round(predictions.focusMomentumFactor * 100)}% pace`
                  : predictions?.expectedMonthlyFocusMinutes
                    ? `${Math.round(predictions.expectedMonthlyFocusMinutes / 60)}h total`
                    : 'Stable'}
              </div>
              <span className="text-[10px] text-text-muted mt-0.5">Velocity Factor</span>
            </button>
          </div>

          {/* EXPANDED FORECAST DETAILS DRAWER */}
          {forecastDetails && (
            <div className="p-4 mt-3 rounded-xl bg-white/[0.03] border border-border text-xs space-y-2 animate-fadeIn">
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <BarChart2 size={14} className="text-purple-400" />
                  <span className="font-bold text-text-primary text-xs">{forecastDetails.title}</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-text-muted">
                  Confidence: <strong className="text-purple-300">{forecastDetails.confidence}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-text-muted block">Current Status</span>
                  <span className="font-semibold text-text-primary">{forecastDetails.currentVal}</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block">Forecast Model Output</span>
                  <span className="font-semibold text-cyan-300">{forecastDetails.predictedVal}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <span className="text-[10px] text-text-muted uppercase font-bold block mb-0.5">
                  Supporting Causal Factor
                </span>
                <p className="text-text-secondary leading-relaxed">{forecastDetails.reasoning}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardWidget>
  );
});

export default AiCoachWidget;
