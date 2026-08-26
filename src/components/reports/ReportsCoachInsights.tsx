/**
 * Reports AI Coach Intelligence Layer (Phase 3.10D)
 *
 * Provides dedicated, accessible, and reactive executive intelligence modules
 * that interpret and elevate Reports data using the FocusForge AI Coach backend.
 *
 * Consumes data EXCLUSIVELY via `useCoach()` with zero duplicate calculations.
 *
 * Components:
 * 1. ReportsExecutiveIntelligence — 4 cards immediately after Executive Summary
 * 2. ReportsBehaviourAnalysis — 6 habit facets (Best Day, Best Window, Weekend, Procrastination, Consistency, Spending)
 * 3. ReportsPerformanceOutlook — 5 predictive forecast cards (Productivity, Weekly Grade, Monthly Trajectory, Budget Runway, Momentum)
 * 4. ReportsStrategicRecommendations — 5 highest-ranked recommendations with expandable explainability
 * 5. ReportsRiskAssessment — Up to 4 active risk cards with expandable probability, impact, and mitigation
 * 6. ReportsPerformanceTimeline — Up to 8 latest chronological milestone and risk events
 * 7. ReportsExecutiveClosingSummary — Compact closing review with Grade, Momentum, Focus Area, Next Action, and Motivation
 *
 * @module components/reports/ReportsCoachInsights
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
  Lightbulb,
  FileText,
  Star,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import type { UseCoachReturn } from '../../hooks/useCoach';
import type { CoachPriority, CoachRecommendation, CoachRiskItem, CoachTimelineEvent } from '../../lib/coach/coachTypes';

// ═══════════════════════════════════════════════════════════════
// 1. SECTION 1: EXECUTIVE INTELLIGENCE (4 CARDS)
// ═══════════════════════════════════════════════════════════════

export interface ReportsExecutiveIntelligenceProps {
  coach: UseCoachReturn;
}

export const ReportsExecutiveIntelligence: React.FC<ReportsExecutiveIntelligenceProps> = memo(
  function ReportsExecutiveIntelligence({ coach }) {
    const { weeklyReview, monthlyReview, habits, recommendations, earlyRisks, dailyBrief } = coach;

    const biggestAchievement =
      monthlyReview?.highlights?.[0] ||
      weeklyReview?.wins?.[0] ||
      (dailyBrief?.yesterdaySummary
        ? dailyBrief.yesterdaySummary
        : 'High-volume focus momentum maintained across work cycles.');

    const biggestConcern =
      earlyRisks?.topCriticalRisks?.[0]?.description ||
      weeklyReview?.improvements?.[0] ||
      'Weekend expenditure velocity outpaces weekday allocation.';

    const bestHabit = habits
      ? `Consistent ${habits.bestWeekday.avgMinutes}m focus on ${habits.bestWeekday.dayName}s during ${habits.bestFocusHour.label}.`
      : 'Morning deep work block delivers peak attention.';

    const primaryOpportunity =
      recommendations[0]?.title ||
      habits?.procrastination.actionableAdvice ||
      'Resolve pending high-priority task backlog early in the week.';

    const cards = [
      {
        icon: Award,
        label: 'Biggest Achievement',
        content: biggestAchievement,
        color: '#10b981',
        bg: 'rgba(16,185,129,0.06)',
        border: 'rgba(16,185,129,0.18)',
      },
      {
        icon: AlertTriangle,
        label: 'Primary Strategic Concern',
        content: biggestConcern,
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.06)',
        border: 'rgba(245,158,11,0.18)',
      },
      {
        icon: Sparkles,
        label: 'Best Behavioural Habit',
        content: bestHabit,
        color: '#06b6d4',
        bg: 'rgba(6,182,212,0.06)',
        border: 'rgba(6,182,212,0.18)',
      },
      {
        icon: Target,
        label: 'Primary Growth Opportunity',
        content: primaryOpportunity,
        color: '#a855f7',
        bg: 'rgba(168,85,247,0.06)',
        border: 'rgba(168,85,247,0.18)',
      },
    ];

    return (
      <div className="glass-card p-6 space-y-4" role="region" aria-label="Executive Intelligence">
        <div className="flex items-center justify-between">
          <div className="section-header mb-0">
            <div
              className="section-header-icon"
              style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
            >
              <Brain size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Executive Intelligence</h3>
              <p className="text-xs text-slate-400">
                AI interpretation of your overall performance and velocity.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card, idx) => {
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
                  <p className="text-xs text-slate-200 leading-relaxed line-clamp-3">
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
// 2. SECTION 2: BEHAVIOUR ANALYSIS (6 HABIT FACETS)
// ═══════════════════════════════════════════════════════════════

export interface ReportsBehaviourAnalysisProps {
  coach: UseCoachReturn;
}

export const ReportsBehaviourAnalysis: React.FC<ReportsBehaviourAnalysisProps> = memo(
  function ReportsBehaviourAnalysis({ coach }) {
    const { habits } = coach;
    if (!habits) return null;

    const habitCards = [
      {
        icon: Calendar,
        label: 'Best Weekday',
        value: habits.bestWeekday.dayName,
        sub: `${habits.bestWeekday.avgMinutes}m focus average`,
        color: '#a855f7',
      },
      {
        icon: Clock,
        label: 'Best Focus Window',
        value: habits.bestFocusHour.label,
        sub: 'Optimal flow state window',
        color: '#06b6d4',
      },
      {
        icon: Wallet,
        label: 'Weekend Dynamics',
        value: `${habits.weekendDynamics.spendingMultiplier}x Weekday Spend`,
        sub: habits.weekendDynamics.isWeekendSpike ? 'Weekend spending surge' : 'Balanced spending',
        color: habits.weekendDynamics.isWeekendSpike ? '#f59e0b' : '#10b981',
      },
      {
        icon: Target,
        label: 'Procrastination Risk',
        value: `${habits.procrastination.procrastinationScore}/100`,
        sub: `${habits.procrastination.overdueTaskCount} overdue items`,
        color: habits.procrastination.procrastinationScore > 50 ? '#ef4444' : '#10b981',
      },
      {
        icon: Flame,
        label: 'Consistency Score',
        value: `${habits.consistencyScore}%`,
        sub: 'Adherence rating',
        color: '#ec4899',
      },
      {
        icon: TrendingUp,
        label: 'Spending Behaviour',
        value: habits.spending.topCategory || 'Disciplined',
        sub: `${habits.spending.spendingConsistencyScore}% discipline score`,
        color: '#3b82f6',
      },
    ];

    return (
      <div className="glass-card p-6 space-y-4" role="region" aria-label="Behaviour Analysis">
        <div className="section-header mb-0">
          <div
            className="section-header-icon"
            style={{ background: 'rgba(6,182,212,0.15)' }}
          >
            <Activity size={18} style={{ color: '#06b6d4' }} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Behavioural & Habit Analysis</h3>
            <p className="text-xs text-slate-400">
              Deep habit signals discovered across focus windows, weekend dynamics, and task cadence.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {habitCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-center flex flex-col justify-between"
              >
                <div>
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center mx-auto mb-2"
                    style={{ backgroundColor: `${card.color}15`, color: card.color }}
                  >
                    <Icon size={14} />
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-0.5">
                    {card.label}
                  </span>
                  <div
                    className="text-sm font-bold truncate"
                    style={{ color: card.color, fontFamily: 'Space Grotesk' }}
                  >
                    {card.value}
                  </div>
                </div>
                <span className="text-[9px] text-slate-500 mt-1 block truncate">{card.sub}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

// ═══════════════════════════════════════════════════════════════
// 3. SECTION 3: PERFORMANCE OUTLOOK (5 PREDICTION CARDS)
// ═══════════════════════════════════════════════════════════════

export interface ReportsPerformanceOutlookProps {
  coach: UseCoachReturn;
}

export const ReportsPerformanceOutlook: React.FC<ReportsPerformanceOutlookProps> = memo(
  function ReportsPerformanceOutlook({ coach }) {
    const { predictions } = coach;
    if (!predictions) return null;

    const cards = [
      {
        label: 'Productivity Forecast',
        value: `${predictions.expectedProductivityScore}/100`,
        sub: 'Projected score',
        color: '#a855f7',
      },
      {
        label: 'Weekly Grade Forecast',
        value: `Grade ${predictions.expectedWeeklyGrade || 'A'}`,
        sub: 'Expected grade trajectory',
        color: '#06b6d4',
      },
      {
        label: 'Monthly Trajectory',
        value: `${Math.round(predictions.expectedMonthlyFocusMinutes / 60)} hrs`,
        sub: 'Estimated total focus',
        color: '#ec4899',
      },
      {
        label: 'Budget Runway',
        value:
          predictions.daysUntilBudgetDepleted !== null && predictions.daysUntilBudgetDepleted !== undefined
            ? `${predictions.daysUntilBudgetDepleted} days`
            : 'Healthy',
        sub: 'Depletion forecast',
        color: '#10b981',
      },
      {
        label: 'Momentum Factor',
        value: predictions.focusMomentumFactor
          ? `${Math.round(predictions.focusMomentumFactor * 100)}%`
          : '100%',
        sub: 'Velocity pace',
        color: '#f59e0b',
      },
    ];

    return (
      <div className="glass-card p-6 space-y-4" role="region" aria-label="Performance Outlook">
        <div className="flex items-center justify-between">
          <div className="section-header mb-0">
            <div
              className="section-header-icon"
              style={{ background: 'rgba(168,85,247,0.15)' }}
            >
              <Zap size={18} style={{ color: '#a855f7' }} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Performance Outlook & Predictions</h3>
              <p className="text-xs text-slate-400">
                Deterministic mathematical forecasts derived from current run rates.
              </p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold text-purple-400 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">
            {predictions.confidence} Confidence
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {cards.map((card, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                  {card.label}
                </span>
                <div
                  className="text-lg font-black tracking-tight"
                  style={{ color: card.color, fontFamily: 'Space Grotesk' }}
                >
                  {card.value}
                </div>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">{card.sub}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

// ═══════════════════════════════════════════════════════════════
// 4. SECTION 4: STRATEGIC RECOMMENDATIONS (TOP 5 EXPANDABLE)
// ═══════════════════════════════════════════════════════════════

export interface ReportsStrategicRecommendationsProps {
  coach: UseCoachReturn;
}

export const ReportsStrategicRecommendations: React.FC<ReportsStrategicRecommendationsProps> = memo(
  function ReportsStrategicRecommendations({ coach }) {
    const { recommendations } = coach;
    const [expandedRecId, setExpandedRecId] = useState<string | null>(null);

    const top5Recs = recommendations.slice(0, 5);
    if (top5Recs.length === 0) return null;

    const toggleRec = (id: string) => {
      setExpandedRecId(prev => (prev === id ? null : id));
    };

    return (
      <div className="glass-card p-6 space-y-4" role="region" aria-label="Strategic Recommendations">
        <div className="section-header mb-0">
          <div
            className="section-header-icon"
            style={{ background: 'rgba(245,158,11,0.15)' }}
          >
            <Lightbulb size={18} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Strategic Recommendations</h3>
            <p className="text-xs text-slate-400">
              Ranked action items with causal explainability and estimated impact.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {top5Recs.map((rec) => {
            const isExpanded = expandedRecId === rec.id;
            return (
              <div
                key={rec.id}
                className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleRec(rec.id)}
                  aria-expanded={isExpanded}
                  aria-controls={`rec-detail-${rec.id}`}
                  className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0">{rec.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white truncate">{rec.title}</h4>
                        <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 truncate mt-0.5">{rec.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-slate-400">
                    <span className="text-[11px] font-semibold text-purple-400 hidden sm:inline-flex items-center gap-1">
                      <HelpCircle size={12} /> Why?
                    </span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>

                {/* EXPANDABLE EXPLAINABILITY DRAWER */}
                {isExpanded && rec.explainability && (
                  <div
                    id={`rec-detail-${rec.id}`}
                    className="p-4 bg-slate-900/90 border-t border-white/5 space-y-3 text-xs animate-fadeIn"
                  >
                    <div>
                      <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider block mb-0.5">
                        Causal Reason
                      </span>
                      <p className="text-slate-200 leading-relaxed">{rec.explainability.why}</p>
                    </div>

                    {rec.explainability.triggerMetrics.length > 0 && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider block mb-1">
                          Trigger Metrics
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {rec.explainability.triggerMetrics.map((tm, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[11px]"
                            >
                              {tm}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                      {rec.explainability.expectedImprovement && (
                        <div>
                          <span className="text-[10px] text-slate-400 block">Expected Improvement</span>
                          <span className="font-semibold text-emerald-400 text-xs">
                            {rec.explainability.expectedImprovement}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] text-slate-400 block">Confidence Level</span>
                        <span className="font-semibold text-cyan-400 text-xs capitalize">
                          {rec.explainability.confidence} Confidence
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

// ═══════════════════════════════════════════════════════════════
// 5. SECTION 5: RISK ASSESSMENT (MAX 4 EXPANDABLE)
// ═══════════════════════════════════════════════════════════════

export interface ReportsRiskAssessmentProps {
  coach: UseCoachReturn;
}

export const ReportsRiskAssessment: React.FC<ReportsRiskAssessmentProps> = memo(
  function ReportsRiskAssessment({ coach }) {
    const { riskAssessment } = coach;
    const [expandedRiskId, setExpandedRiskId] = useState<string | null>(null);

    const activeRisks = riskAssessment.slice(0, 4);

    const toggleRisk = (id: string) => {
      setExpandedRiskId(prev => (prev === id ? null : id));
    };

    return (
      <div className="glass-card p-6 space-y-4" role="region" aria-label="Risk Assessment">
        <div className="flex items-center justify-between">
          <div className="section-header mb-0">
            <div
              className="section-header-icon"
              style={{ background: 'rgba(239,68,68,0.15)' }}
            >
              <ShieldAlert size={18} style={{ color: '#ef4444' }} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Executive Risk Assessment</h3>
              <p className="text-xs text-slate-400">
                Proactive risk mitigation analyzed by the Early Risk Engine.
              </p>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold">
            {activeRisks.length} active
          </span>
        </div>

        <div className="space-y-3">
          {activeRisks.length > 0 ? (
            activeRisks.map((risk) => {
              const isExpanded = expandedRiskId === risk.id;
              const isCritical = risk.severity === 'critical';
              const isHigh = risk.severity === 'high';

              const severityStyle = isCritical
                ? 'text-red-400 bg-red-500/10 border-red-500/25'
                : isHigh
                ? 'text-amber-400 bg-amber-500/10 border-amber-500/25'
                : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25';

              return (
                <div
                  key={risk.id}
                  className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden transition-all"
                >
                  <button
                    onClick={() => toggleRisk(risk.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`risk-rep-${risk.id}`}
                    className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">{risk.icon}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white truncate">{risk.title}</h4>
                          <span
                            className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full border ${severityStyle}`}
                          >
                            {risk.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 truncate mt-0.5">{risk.description}</p>
                      </div>
                    </div>

                    <div className="shrink-0 text-slate-400">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>

                  {/* EXPANDABLE RISK DETAILS */}
                  {isExpanded && (
                    <div
                      id={`risk-rep-${risk.id}`}
                      className="p-4 bg-slate-900/90 border-t border-white/5 space-y-3 text-xs animate-fadeIn"
                    >
                      <div className="grid grid-cols-2 gap-3 text-[11px] pb-2 border-b border-white/5">
                        <div>
                          <span className="text-slate-500 block">Severity Tier:</span>
                          <span className="font-bold text-red-400 capitalize">{risk.severity}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Probability:</span>
                          <span className="font-bold text-amber-400 capitalize">
                            {risk.probability || 'High'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                          Impact Assessment
                        </span>
                        <p className="text-slate-200 leading-relaxed">{risk.impact || risk.description}</p>
                      </div>

                      {risk.action && (
                        <div className="pt-2 border-t border-white/5">
                          <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">
                            Suggested Mitigation
                          </span>
                          <p className="text-slate-100 font-semibold">{risk.action}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-3">
              <ShieldCheck size={20} className="text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-emerald-400 block">All Systems Optimal</span>
                <span className="text-xs text-slate-400">
                  No critical friction points or performance anomalies detected.
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
// 6. SECTION 6: PERFORMANCE TIMELINE (MAX 8 EVENTS)
// ═══════════════════════════════════════════════════════════════

export interface ReportsPerformanceTimelineProps {
  coach: UseCoachReturn;
}

export const ReportsPerformanceTimeline: React.FC<ReportsPerformanceTimelineProps> = memo(
  function ReportsPerformanceTimeline({ coach }) {
    const { timeline } = coach;
    const events = timeline.slice(0, 8);

    if (events.length === 0) return null;

    return (
      <div className="glass-card p-6 space-y-4" role="region" aria-label="Performance Timeline">
        <div className="section-header mb-0">
          <div
            className="section-header-icon"
            style={{ background: 'rgba(168,85,247,0.15)' }}
          >
            <Clock size={18} style={{ color: '#a855f7' }} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Performance Timeline</h3>
            <p className="text-xs text-slate-400">
              Chronological log of executive milestones, habit discoveries, and risk triggers.
            </p>
          </div>
        </div>

        <div className="space-y-3 relative pl-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
          {events.map((evt) => (
            <div key={evt.id} className="relative flex items-start gap-3 text-xs">
              <div className="w-3 h-3 rounded-full bg-purple-500/40 border border-purple-400 shrink-0 mt-0.5 -ml-[19px]" />
              <div className="flex-1 min-w-0 bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-bold text-white truncate">{evt.title}</span>
                  <span className="text-[10px] text-slate-500 shrink-0">{evt.timeframe}</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">{evt.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

// ═══════════════════════════════════════════════════════════════
// 7. SECTION 7: EXECUTIVE CLOSING SUMMARY
// ═══════════════════════════════════════════════════════════════

export interface ReportsExecutiveClosingSummaryProps {
  coach: UseCoachReturn;
}

export const ReportsExecutiveClosingSummary: React.FC<ReportsExecutiveClosingSummaryProps> = memo(
  function ReportsExecutiveClosingSummary({ coach }) {
    const { predictions, weeklyReview, recommendations, habits, dailyBrief } = coach;

    const overallGrade = predictions?.expectedWeeklyGrade || weeklyReview?.grade || 'A';
    const momentum = predictions?.focusMomentumFactor
      ? `${Math.round(predictions.focusMomentumFactor * 100)}%`
      : '100%';
    const primaryFocusArea = habits?.bestFocusHour.label || 'Deep Work Execution';
    const nextBestAction =
      recommendations[0]?.action ||
      recommendations[0]?.title ||
      'Maintain daily focus consistency and protect momentum.';
    const motivation =
      dailyBrief?.motivation ||
      weeklyReview?.motivation ||
      'Consistent execution over time compounds into exceptional performance.';

    return (
      <div
        className="glass-card p-6 space-y-4 relative overflow-hidden"
        role="region"
        aria-label="Executive Closing Summary"
        style={{
          background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(6,182,212,0.04))',
          border: '1px solid rgba(168,85,247,0.2)',
        }}
      >
        <div className="section-header mb-0">
          <div
            className="section-header-icon"
            style={{ background: 'linear-gradient(135deg, #a855f7, #06b6d4)' }}
          >
            <Award size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Executive Closing Summary</h3>
            <p className="text-xs text-slate-400">
              High-level strategic alignment and recommended execution cadence.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Overall Grade
            </span>
            <div className="text-xl font-black text-purple-400 font-space mt-0.5">
              Grade {overallGrade}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Current Momentum
            </span>
            <div className="text-xl font-black text-cyan-400 font-space mt-0.5">
              {momentum}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Primary Focus Window
            </span>
            <div className="text-sm font-bold text-pink-400 font-space mt-1 truncate">
              {primaryFocusArea}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Next Strategic Step
            </span>
            <div className="text-xs font-semibold text-emerald-400 mt-1 line-clamp-2">
              {nextBestAction}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/20 flex items-center gap-3">
          <Sparkles size={18} className="text-purple-400 shrink-0" />
          <p className="text-xs text-purple-200 font-medium leading-relaxed italic">
            "{motivation}"
          </p>
        </div>
      </div>
    );
  }
);
