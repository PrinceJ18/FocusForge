/**
 * AI Command Center (Phase 3.10F)
 *
 * The executive cockpit for FocusForge — a unified AI-driven overview
 * presenting all coach intelligence on a single dedicated page.
 *
 * Consumes data EXCLUSIVELY from a single `useCoach()` instance.
 * Zero backend changes, zero new intelligence, zero duplicated calculations.
 *
 * Sections:
 * 1. Today's Executive Brief — hero section with greeting, status, grade, momentum
 * 2. Performance Scoreboard — 6 facets with score, trend, direction, confidence
 * 3. Today's Priorities — top 5 recommendations with expandable explainability
 * 4. Active Risk Center — risks grouped by severity
 * 5. Future Outlook — weekly/monthly forecasts, budget runway, momentum
 * 6. Behaviour Intelligence — habit analysis grid
 * 7. Intelligence Timeline — chronological events grouped by day
 * 8. Achievements & Milestones — unlocks, milestones, progress bars
 * 9. System Health — collapsed developer diagnostics
 *
 * @module pages/CommandCenter
 */

import React, { memo, useMemo, useState, useCallback } from 'react';
import {
  Brain,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Award,
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  Target,
  Sparkles,
  Calendar,
  Flame,
  Wallet,
  ChevronDown,
  ChevronUp,
  Activity,
  Timer,
  ListChecks,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  HelpCircle,
  Server,
  Cpu,
  BarChart3,
  Eye,
} from 'lucide-react';
import { useCoach, type UseCoachReturn } from '../hooks/useCoach';
import { COACH_INFRASTRUCTURE } from '../lib/coach/coachConstants';
import type {
  CoachRecommendation,
  CoachRiskItem,
  CoachTimelineEvent,
  CoachHabitAnalysis,
  CoachBehaviourTrends,
  CoachPredictions,
  TrendDirection,
} from '../lib/coach/coachTypes';

// ═══════════════════════════════════════════════════════════════
// Shared Utilities
// ═══════════════════════════════════════════════════════════════

function TrendBadge({ direction }: { direction: TrendDirection | undefined }) {
  if (!direction) return null;
  const conf: Record<TrendDirection, { icon: React.ElementType; color: string; label: string }> = {
    improving: { icon: ArrowUpRight, color: '#10b981', label: 'Improving' },
    declining: { icon: ArrowDownRight, color: '#ef4444', label: 'Declining' },
    stable: { icon: Minus, color: '#94a3b8', label: 'Stable' },
  };
  const c = conf[direction];
  const Icon = c.icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
      style={{ color: c.color, backgroundColor: `${c.color}10`, borderColor: `${c.color}30` }}
    >
      <Icon size={10} />
      {c.label}
    </span>
  );
}

function SeverityChip({ severity }: { severity: string }) {
  const colorMap: Record<string, string> = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#06b6d4',
    low: '#94a3b8',
    info: '#a855f7',
  };
  const c = colorMap[severity] || '#94a3b8';
  return (
    <span
      className="text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full border"
      style={{ color: c, backgroundColor: `${c}10`, borderColor: `${c}30` }}
    >
      {severity}
    </span>
  );
}

function ConfidenceChip({ confidence }: { confidence?: string }) {
  if (!confidence) return null;
  const colorMap: Record<string, string> = {
    high: '#10b981',
    medium: '#f59e0b',
    low: '#ef4444',
  };
  const c = colorMap[confidence] || '#94a3b8';
  return (
    <span
      className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border"
      style={{ color: c, backgroundColor: `${c}10`, borderColor: `${c}30` }}
    >
      {confidence}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════

export default function CommandCenter() {
  const coach = useCoach();

  return (
    <div className="page-enter space-y-6 text-left pb-16">
      {/* ═══ PAGE HEADER ═══ */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #a855f7, #06b6d4)' }}
        >
          <Brain size={20} className="text-white" />
        </div>
        <div>
          <h1
            className="text-xl font-black text-slate-100 tracking-tight"
            style={{ fontFamily: 'Space Grotesk' }}
          >
            AI Command Center
          </h1>
          <p className="text-xs text-slate-400">
            Executive intelligence cockpit — unified AI-driven performance overview.
          </p>
        </div>
      </div>

      {/* SECTION 1: Executive Brief */}
      <ExecutiveBrief coach={coach} />

      {/* SECTION 2: Performance Scoreboard */}
      <PerformanceScoreboard coach={coach} />

      {/* SECTION 3: Today's Priorities */}
      <TodaysPriorities coach={coach} />

      {/* SECTION 4: Active Risk Center */}
      <ActiveRiskCenter coach={coach} />

      {/* SECTION 5: Future Outlook */}
      <FutureOutlook coach={coach} />

      {/* SECTION 6: Behaviour Intelligence */}
      <BehaviourIntelligence coach={coach} />

      {/* SECTION 7: Intelligence Timeline */}
      <IntelligenceTimeline coach={coach} />

      {/* SECTION 8: Achievements & Milestones */}
      <AchievementsMilestones coach={coach} />

      {/* SECTION 9: System Health */}
      <SystemHealth coach={coach} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1: TODAY'S EXECUTIVE BRIEF
// ═══════════════════════════════════════════════════════════════

const ExecutiveBrief: React.FC<{ coach: UseCoachReturn }> = memo(function ExecutiveBrief({
  coach,
}) {
  const brief = coach.dailyBrief;
  const predictions = coach.predictions;
  const risks = coach.riskAssessment;
  const topRec = coach.recommendations[0];

  if (!brief) {
    return (
      <div className="glass-card p-8 text-center" role="region" aria-label="Executive Brief">
        <Brain size={32} className="mx-auto text-slate-500 mb-3" />
        <h3 className="text-sm font-bold text-slate-300">Gathering Intelligence…</h3>
        <p className="text-xs text-slate-500 mt-1">
          The AI Coach needs more data to generate your daily brief.
        </p>
      </div>
    );
  }

  // Derive overall status
  const overallGrade = predictions?.expectedWeeklyGrade || 'B';
  const momentum = coach.behaviourTrends?.trendMomentumScore ?? 0;
  const momentumLabel =
    momentum > 20 ? 'Strong' : momentum > 0 ? 'Positive' : momentum > -20 ? 'Steady' : 'Declining';
  const momentumColor =
    momentum > 20 ? '#10b981' : momentum > 0 ? '#06b6d4' : momentum > -20 ? '#f59e0b' : '#ef4444';

  const biggestOpportunity = topRec?.title || 'Keep up your current momentum.';
  const biggestRisk = risks[0]?.title || 'No critical risks detected.';

  return (
    <div
      className="glass-card overflow-hidden"
      role="region"
      aria-label="Today's Executive Brief"
      style={{ border: '1px solid rgba(168,85,247,0.2)' }}
    >
      {/* Gradient accent bar */}
      <div className="h-1" style={{ background: 'linear-gradient(90deg, #a855f7, #06b6d4, #ec4899)' }} />

      <div className="p-5 sm:p-6 space-y-5">
        {/* Greeting & Status Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2
              className="text-lg sm:text-xl font-extrabold text-white"
              style={{ fontFamily: 'Space Grotesk' }}
            >
              {brief.greeting}
            </h2>
            <p className="text-xs text-slate-300 mt-1">{brief.yesterdaySummary}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Grade */}
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black text-white"
                style={{
                  background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                  boxShadow: '0 0 24px rgba(168,85,247,0.3)',
                }}
              >
                {overallGrade}
              </div>
              <span className="text-[9px] text-slate-500 uppercase font-bold mt-1 block">Grade</span>
            </div>

            {/* Momentum */}
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xs font-extrabold border"
                style={{
                  color: momentumColor,
                  backgroundColor: `${momentumColor}10`,
                  borderColor: `${momentumColor}25`,
                }}
              >
                {momentum > 0 ? '+' : ''}
                {momentum}
              </div>
              <span className="text-[9px] text-slate-500 uppercase font-bold mt-1 block">
                {momentumLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Streak Status */}
        <div className="flex items-center gap-2 text-xs">
          <Flame size={14} style={{ color: brief.streakStatus.isAtRisk ? '#ef4444' : '#f59e0b' }} />
          <span className="text-slate-200 font-semibold">
            {brief.streakStatus.currentStreak}-day streak
          </span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-400">{brief.streakStatus.message}</span>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricPill
            label="Biggest Opportunity"
            value={biggestOpportunity}
            icon={<Target size={13} />}
            color="#10b981"
          />
          <MetricPill
            label="Biggest Risk"
            value={biggestRisk}
            icon={<ShieldAlert size={13} />}
            color={risks.length > 0 ? '#ef4444' : '#10b981'}
          />
          <MetricPill
            label="Primary Action"
            value={topRec?.action || 'Maintain focus and consistency.'}
            icon={<Zap size={13} />}
            color="#a855f7"
          />
          <MetricPill
            label="Focus Window"
            value={brief.primeFocusWindow || 'Analyzing…'}
            icon={<Clock size={13} />}
            color="#06b6d4"
          />
        </div>

        {/* Motivation */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-purple-500/5 border border-purple-500/15">
          <Sparkles size={14} className="text-purple-400 shrink-0 mt-0.5" />
          <p className="text-xs text-purple-200 italic leading-relaxed">{brief.motivation}</p>
        </div>
      </div>
    </div>
  );
});

function MetricPill({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
      <div className="flex items-center gap-1.5 mb-1">
        <span style={{ color }}>{icon}</span>
        <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">{label}</span>
      </div>
      <p className="text-[11px] text-slate-200 font-semibold leading-snug line-clamp-2">{value}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2: PERFORMANCE SCOREBOARD
// ═══════════════════════════════════════════════════════════════

const PerformanceScoreboard: React.FC<{ coach: UseCoachReturn }> = memo(
  function PerformanceScoreboard({ coach }) {
    const { predictions, behaviourTrends, habits, earlyRisks } = coach;

    const facets = useMemo(() => {
      const items: Array<{
        label: string;
        score: number;
        trend: TrendDirection | undefined;
        confidence: string | undefined;
        icon: React.ElementType;
        color: string;
      }> = [
        {
          label: 'Productivity',
          score: predictions?.expectedProductivityScore ?? 0,
          trend: behaviourTrends?.productivity.direction,
          confidence: behaviourTrends?.productivity.confidence,
          icon: BarChart3,
          color: '#a855f7',
        },
        {
          label: 'Finance',
          score: predictions?.expectedFinancialScore ?? 0,
          trend: behaviourTrends?.finance.direction,
          confidence: behaviourTrends?.finance.confidence,
          icon: Wallet,
          color: '#10b981',
        },
        {
          label: 'Focus',
          score: Math.min(100, Math.round((predictions?.expectedDailyProgress ?? 0))),
          trend: behaviourTrends?.focus.direction,
          confidence: behaviourTrends?.focus.confidence,
          icon: Timer,
          color: '#06b6d4',
        },
        {
          label: 'Consistency',
          score: habits?.consistencyScore ?? 0,
          trend: habits?.consistencyTrend,
          confidence: behaviourTrends?.consistency.confidence,
          icon: Flame,
          color: '#f59e0b',
        },
        {
          label: 'Habits',
          score:
            habits
              ? Math.round(
                  (habits.consistencyScore +
                    (100 - habits.procrastinationPatterns.delayFrequencyScore)) /
                    2
                )
              : 0,
          trend: behaviourTrends?.overallDirection,
          confidence: 'medium',
          icon: Activity,
          color: '#ec4899',
        },
        {
          label: 'Risk',
          score: earlyRisks
            ? Math.max(0, 100 - earlyRisks.streakLossRisk.riskScore - earlyRisks.burnoutRisk.riskScore)
            : 100,
          trend:
            earlyRisks?.overallRiskLevel === 'minimal' || earlyRisks?.overallRiskLevel === 'low'
              ? 'improving' as TrendDirection
              : earlyRisks?.overallRiskLevel === 'high' || earlyRisks?.overallRiskLevel === 'critical'
              ? 'declining' as TrendDirection
              : 'stable' as TrendDirection,
          confidence:
            earlyRisks?.overallRiskLevel === 'critical'
              ? 'high'
              : earlyRisks?.overallRiskLevel === 'high'
              ? 'medium'
              : 'low',
          icon: Shield,
          color: '#8b5cf6',
        },
      ];
      return items;
    }, [predictions, behaviourTrends, habits, earlyRisks]);

    return (
      <div className="glass-card p-5 space-y-4" role="region" aria-label="Performance Scoreboard">
        <div className="section-header mb-0">
          <div
            className="section-header-icon"
            style={{ background: 'rgba(168,85,247,0.15)' }}
          >
            <BarChart3 size={16} style={{ color: '#a855f7' }} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Performance Scoreboard</h3>
            <p className="text-[11px] text-slate-400">
              Six-facet health check across all performance dimensions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {facets.map((f) => {
            const Icon = f.icon;
            const scoreColor =
              f.score >= 80 ? '#10b981' : f.score >= 60 ? '#06b6d4' : f.score >= 40 ? '#f59e0b' : '#ef4444';
            return (
              <div
                key={f.label}
                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-center space-y-2"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto"
                  style={{ backgroundColor: `${f.color}15`, color: f.color }}
                >
                  <Icon size={16} />
                </div>
                <div
                  className="text-xl font-black"
                  style={{ color: scoreColor, fontFamily: 'Space Grotesk' }}
                >
                  {f.score}
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  {f.label}
                </span>
                <div className="flex items-center justify-center gap-1">
                  <TrendBadge direction={f.trend} />
                </div>
                <ConfidenceChip confidence={f.confidence} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

// ═══════════════════════════════════════════════════════════════
// SECTION 3: TODAY'S PRIORITIES
// ═══════════════════════════════════════════════════════════════

const TodaysPriorities: React.FC<{ coach: UseCoachReturn }> = memo(function TodaysPriorities({
  coach,
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const recs = coach.recommendations.slice(0, 5);

  if (recs.length === 0) return null;

  return (
    <div className="glass-card p-5 space-y-4" role="region" aria-label="Today's Priorities">
      <div className="section-header mb-0">
        <div
          className="section-header-icon"
          style={{ background: 'rgba(16,185,129,0.15)' }}
        >
          <ListChecks size={16} style={{ color: '#10b981' }} />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-100">Today's Priorities</h3>
          <p className="text-[11px] text-slate-400">
            Top ranked recommendations with full explainability.
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {recs.map((rec, idx) => {
          const isExpanded = expandedId === rec.id;
          return (
            <div
              key={rec.id}
              className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden transition-all"
            >
              <button
                onClick={() => setExpandedId((prev) => (prev === rec.id ? null : rec.id))}
                aria-expanded={isExpanded}
                aria-controls={`priority-${rec.id}`}
                className="w-full p-3.5 flex items-center gap-3 text-left hover:bg-white/[0.02] transition-colors"
              >
                <span className="text-xs font-black text-slate-500 w-5 text-center shrink-0">
                  #{idx + 1}
                </span>
                <span className="text-lg shrink-0">{rec.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h5 className="text-xs font-bold text-white truncate">{rec.title}</h5>
                    <SeverityChip severity={rec.priority} />
                  </div>
                  <p className="text-[11px] text-slate-300 truncate">{rec.description}</p>
                </div>
                <div className="flex items-center gap-1.5 text-purple-400 text-[11px] font-semibold shrink-0">
                  <HelpCircle size={13} />
                  <span className="hidden sm:inline">Why?</span>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              {isExpanded && (
                <div
                  id={`priority-${rec.id}`}
                  className="p-4 bg-slate-900/90 border-t border-white/5 space-y-3 text-xs animate-fadeIn"
                >
                  {/* Explainability */}
                  {rec.explainability && (
                    <>
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
                            {rec.explainability.triggerMetrics.map((tm, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[11px]"
                              >
                                {tm.label}: {tm.current}{tm.unit} (threshold: {tm.threshold}{tm.unit})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {rec.explainability.relatedMetrics.length > 0 && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                            Related Metrics
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {rec.explainability.relatedMetrics.map((m, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 text-[11px]"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Expected Improvement</span>
                          <span className="font-semibold text-emerald-400">
                            {rec.explainability.expectedImprovement}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Confidence</span>
                          <span className="font-semibold text-cyan-400 capitalize">
                            {rec.confidence || 'medium'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Impact × Urgency</span>
                          <span className="font-semibold text-amber-400 capitalize">
                            {rec.impact || 'medium'} × {rec.urgency || 'medium'}
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Action */}
                  <div className="pt-2 border-t border-white/5">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block mb-0.5">
                      Recommended Action
                    </span>
                    <p className="text-slate-100 font-semibold">{rec.action}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════
// SECTION 4: ACTIVE RISK CENTER
// ═══════════════════════════════════════════════════════════════

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'] as const;

const ActiveRiskCenter: React.FC<{ coach: UseCoachReturn }> = memo(function ActiveRiskCenter({
  coach,
}) {
  const [expandedRiskId, setExpandedRiskId] = useState<string | null>(null);
  const risks = coach.riskAssessment;

  const grouped = useMemo(() => {
    const groups: Record<string, CoachRiskItem[]> = {};
    SEVERITY_ORDER.forEach((s) => (groups[s] = []));
    risks.forEach((r) => {
      const key = r.severity || 'medium';
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return SEVERITY_ORDER.map((s) => ({ severity: s, items: groups[s] })).filter(
      (g) => g.items.length > 0
    );
  }, [risks]);

  return (
    <div className="glass-card p-5 space-y-4" role="region" aria-label="Active Risk Center">
      <div className="flex items-center justify-between">
        <div className="section-header mb-0">
          <div
            className="section-header-icon"
            style={{ background: 'rgba(239,68,68,0.15)' }}
          >
            <ShieldAlert size={16} style={{ color: '#ef4444' }} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Active Risk Center</h3>
            <p className="text-[11px] text-slate-400">
              All detected risks grouped by severity level.
            </p>
          </div>
        </div>
        <span className="text-[10px] text-slate-500 font-semibold">{risks.length} total</span>
      </div>

      {grouped.length > 0 ? (
        grouped.map((group) => (
          <div key={group.severity} className="space-y-2">
            <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider pl-1 flex items-center gap-2">
              <SeverityChip severity={group.severity} />
              <span>{group.items.length} {group.severity} risk{group.items.length > 1 ? 's' : ''}</span>
            </h4>
            {group.items.map((risk) => {
              const isExpanded = expandedRiskId === risk.id;
              return (
                <div
                  key={risk.id}
                  className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedRiskId((prev) => (prev === risk.id ? null : risk.id))
                    }
                    aria-expanded={isExpanded}
                    aria-controls={`risk-detail-${risk.id}`}
                    className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-base shrink-0">{risk.icon}</span>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-white truncate">{risk.title}</h5>
                        <p className="text-[11px] text-slate-300 truncate mt-0.5">{risk.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {risk.probability && <ConfidenceChip confidence={risk.probability} />}
                      {isExpanded ? (
                        <ChevronUp size={14} className="text-slate-400" />
                      ) : (
                        <ChevronDown size={14} className="text-slate-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div
                      id={`risk-detail-${risk.id}`}
                      className="p-4 bg-slate-900/90 border-t border-white/5 space-y-2.5 text-xs animate-fadeIn"
                    >
                      <div className="grid grid-cols-2 gap-2 pb-2 border-b border-white/5">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Severity</span>
                          <SeverityChip severity={risk.severity} />
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Probability</span>
                          <span className="font-bold text-amber-400 capitalize">
                            {risk.probability || 'Unknown'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                          Impact
                        </span>
                        <p className="text-slate-200 leading-relaxed">{risk.description}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                          Threshold Breached
                        </span>
                        <p className="text-slate-200">
                          {risk.threshold.label}: {risk.threshold.actual}{risk.threshold.unit} (limit:{' '}
                          {risk.threshold.limit}{risk.threshold.unit})
                        </p>
                      </div>
                      {risk.suggestedAction && (
                        <div className="pt-2 border-t border-white/5">
                          <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">
                            Mitigation
                          </span>
                          <p className="text-slate-100 font-semibold">{risk.suggestedAction}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))
      ) : (
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-3">
          <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
          <div>
            <span className="text-xs font-bold text-emerald-400 block">All Systems Clear</span>
            <span className="text-[11px] text-slate-400">
              No active risks or anomalies detected across all dimensions.
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════
// SECTION 5: FUTURE OUTLOOK
// ═══════════════════════════════════════════════════════════════

const FutureOutlook: React.FC<{ coach: UseCoachReturn }> = memo(function FutureOutlook({
  coach,
}) {
  const { predictions, weeklyReview, monthlyReview } = coach;
  if (!predictions) return null;

  const items: Array<{
    label: string;
    value: string;
    icon: React.ElementType;
    color: string;
    sub?: string;
  }> = [
    {
      label: 'Weekly Grade',
      value: predictions.expectedWeeklyGrade,
      icon: Award,
      color: '#a855f7',
      sub: weeklyReview ? `Week score: ${weeklyReview.weekScore}/100` : undefined,
    },
    {
      label: 'Monthly Grade',
      value: predictions.expectedMonthlyGrade,
      icon: Calendar,
      color: '#ec4899',
      sub: monthlyReview ? `Month: ${monthlyReview.monthLabel || 'Current'}` : undefined,
    },
    {
      label: 'Budget Runway',
      value:
        predictions.daysUntilBudgetDepleted != null
          ? `${predictions.daysUntilBudgetDepleted} days`
          : 'Safe',
      icon: Wallet,
      color:
        predictions.daysUntilBudgetDepleted != null && predictions.daysUntilBudgetDepleted < 10
          ? '#ef4444'
          : '#10b981',
      sub: predictions.spendingVelocityFactor
        ? `Velocity: ${predictions.spendingVelocityFactor.toFixed(2)}x`
        : undefined,
    },
    {
      label: 'Focus Momentum',
      value: predictions.focusMomentumFactor
        ? `${Math.round(predictions.focusMomentumFactor * 100)}%`
        : 'Baseline',
      icon: Zap,
      color: '#f59e0b',
      sub: `Projected: ${Math.round(predictions.expectedMonthlyFocusMinutes / 60)}h this month`,
    },
    {
      label: 'Monthly Spending',
      value: `₹${Math.round(predictions.expectedMonthlySpending).toLocaleString()}`,
      icon: TrendingUp,
      color: '#06b6d4',
    },
    {
      label: 'Productivity Score',
      value: `${predictions.expectedProductivityScore}/100`,
      icon: Target,
      color: '#8b5cf6',
      sub: `Confidence: ${predictions.confidence}`,
    },
  ];

  return (
    <div className="glass-card p-5 space-y-4" role="region" aria-label="Future Outlook">
      <div className="flex items-center justify-between">
        <div className="section-header mb-0">
          <div
            className="section-header-icon"
            style={{ background: 'rgba(6,182,212,0.15)' }}
          >
            <Eye size={16} style={{ color: '#06b6d4' }} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Future Outlook</h3>
            <p className="text-[11px] text-slate-400">
              Deterministic forecasts and projections from the Prediction Engine.
            </p>
          </div>
        </div>
        <ConfidenceChip confidence={predictions.confidence} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5"
            >
              <div className="flex items-center gap-1.5">
                <Icon size={13} style={{ color: item.color }} />
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  {item.label}
                </span>
              </div>
              <div
                className="text-sm font-extrabold"
                style={{ color: item.color, fontFamily: 'Space Grotesk' }}
              >
                {item.value}
              </div>
              {item.sub && <p className="text-[10px] text-slate-500">{item.sub}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════
// SECTION 6: BEHAVIOUR INTELLIGENCE
// ═══════════════════════════════════════════════════════════════

const BehaviourIntelligence: React.FC<{ coach: UseCoachReturn }> = memo(
  function BehaviourIntelligence({ coach }) {
    const { habits } = coach;
    if (!habits) return null;

    const cards: Array<{
      label: string;
      value: string;
      detail: string;
      icon: React.ElementType;
      color: string;
    }> = [
      {
        label: 'Best Weekday',
        value: habits.bestWeekday.dayName,
        detail: `${habits.bestWeekday.avgFocusMinutes}m avg focus, ${habits.bestWeekday.avgTasksCompleted} tasks avg.`,
        icon: Calendar,
        color: '#a855f7',
      },
      {
        label: 'Peak Focus Window',
        value: habits.bestFocusHour.timeWindow,
        detail: `${habits.bestFocusHour.totalMinutes}m total across ${habits.bestFocusHour.sessionCount} sessions.`,
        icon: Clock,
        color: '#06b6d4',
      },
      {
        label: 'Weekend Behaviour',
        value:
          habits.weekendBehaviour.pattern === 'productive_weekend'
            ? 'Productive'
            : habits.weekendBehaviour.pattern === 'relaxed_weekend'
            ? 'Relaxed'
            : habits.weekendBehaviour.pattern === 'high_spending_weekend'
            ? 'High Spending'
            : 'Balanced',
        detail: habits.weekendBehaviour.insight,
        icon: Activity,
        color:
          habits.weekendBehaviour.pattern === 'high_spending_weekend' ? '#f59e0b' : '#10b981',
      },
      {
        label: 'Procrastination',
        value: habits.procrastinationPatterns.tendency === 'proactive'
          ? 'Proactive'
          : habits.procrastinationPatterns.tendency === 'moderate'
          ? 'Moderate'
          : 'Chronic Delay',
        detail: habits.procrastinationPatterns.patternSummary,
        icon: AlertTriangle,
        color:
          habits.procrastinationPatterns.tendency === 'proactive'
            ? '#10b981'
            : habits.procrastinationPatterns.tendency === 'moderate'
            ? '#f59e0b'
            : '#ef4444',
      },
      {
        label: 'Consistency',
        value: `${habits.consistencyScore}%`,
        detail: `Trend: ${habits.consistencyTrend}`,
        icon: Flame,
        color: '#ec4899',
      },
      {
        label: 'Spending Behaviour',
        value: habits.spendingHabits.topSpendingCategory,
        detail: habits.spendingHabits.summary,
        icon: Wallet,
        color: '#8b5cf6',
      },
      {
        label: 'Habit Strength',
        value: habits.primaryHabitStrength,
        detail: 'Your strongest established behaviour pattern.',
        icon: CheckCircle,
        color: '#10b981',
      },
      {
        label: 'Habit Leak',
        value: habits.primaryHabitLeak,
        detail: 'Area where habit formation has the most room for improvement.',
        icon: AlertTriangle,
        color: '#ef4444',
      },
    ];

    return (
      <div className="glass-card p-5 space-y-4" role="region" aria-label="Behaviour Intelligence">
        <div className="section-header mb-0">
          <div
            className="section-header-icon"
            style={{ background: 'rgba(236,72,153,0.15)' }}
          >
            <Brain size={16} style={{ color: '#ec4899' }} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Behaviour Intelligence</h3>
            <p className="text-[11px] text-slate-400">
              Deep habit analysis across focus, spending, consistency, and procrastination.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.label}
                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: `${c.color}15`, color: c.color }}
                  >
                    <Icon size={12} />
                  </div>
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                    {c.label}
                  </span>
                </div>
                <div
                  className="text-sm font-extrabold truncate"
                  style={{ color: c.color, fontFamily: 'Space Grotesk' }}
                >
                  {c.value}
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{c.detail}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

// ═══════════════════════════════════════════════════════════════
// SECTION 7: INTELLIGENCE TIMELINE
// ═══════════════════════════════════════════════════════════════

const IntelligenceTimeline: React.FC<{ coach: UseCoachReturn }> = memo(
  function IntelligenceTimeline({ coach }) {
    const events = coach.timeline.slice(0, 20);
    if (events.length === 0) return null;

    // Group by day: Today / Yesterday / Earlier using timestamp
    const grouped = useMemo(() => {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      const groups: { label: string; events: CoachTimelineEvent[] }[] = [
        { label: 'Today', events: [] },
        { label: 'Yesterday', events: [] },
        { label: 'Earlier', events: [] },
      ];

      events.forEach((evt) => {
        const dateStr = evt.timestamp.slice(0, 10);
        if (dateStr === todayStr) {
          groups[0].events.push(evt);
        } else if (dateStr === yesterdayStr) {
          groups[1].events.push(evt);
        } else {
          groups[2].events.push(evt);
        }
      });

      return groups.filter((g) => g.events.length > 0);
    }, [events]);

    return (
      <div className="glass-card p-5 space-y-4" role="region" aria-label="Intelligence Timeline">
        <div className="section-header mb-0">
          <div
            className="section-header-icon"
            style={{ background: 'rgba(168,85,247,0.15)' }}
          >
            <Clock size={16} style={{ color: '#a855f7' }} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Intelligence Timeline</h3>
            <p className="text-[11px] text-slate-400">
              Chronological log of milestones, trend shifts, and risk detections.
            </p>
          </div>
        </div>

        {grouped.map((group) => (
          <div key={group.label} className="space-y-2.5">
            <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider pl-1">
              {group.label}
            </h4>
            <div className="space-y-2 relative pl-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
              {group.events.map((evt) => {
                const typeColors: Record<string, string> = {
                  trend_shift: '#06b6d4',
                  milestone: '#f59e0b',
                  risk_detected: '#ef4444',
                  habit_formed: '#10b981',
                  achievement: '#a855f7',
                  goal_projection: '#ec4899',
                };
                const dotColor = typeColors[evt.type] || '#94a3b8';

                return (
                  <div key={evt.id} className="relative flex items-start gap-3 text-xs">
                    <div
                      className="w-3 h-3 rounded-full border-2 shrink-0 mt-0.5 -ml-[19px]"
                      style={{ backgroundColor: `${dotColor}60`, borderColor: dotColor }}
                    />
                    <div className="flex-1 min-w-0 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm shrink-0">{evt.icon}</span>
                          <span className="font-bold text-white truncate">{evt.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {evt.timestamp.slice(0, 10)}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">{evt.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }
);

// ═══════════════════════════════════════════════════════════════
// SECTION 8: ACHIEVEMENTS & MILESTONES
// ═══════════════════════════════════════════════════════════════

const AchievementsMilestones: React.FC<{ coach: UseCoachReturn }> = memo(
  function AchievementsMilestones({ coach }) {
    const { achievementsSummary, dailyBrief } = coach;
    if (!achievementsSummary) return null;

    const { recentAchievements, approachingMilestones, periodXP, currentLevel, totalBadges } =
      achievementsSummary;

    return (
      <div className="glass-card p-5 space-y-4" role="region" aria-label="Achievements and Milestones">
        <div className="section-header mb-0">
          <div
            className="section-header-icon"
            style={{ background: 'rgba(245,158,11,0.15)' }}
          >
            <Award size={16} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Achievements & Milestones</h3>
            <p className="text-[11px] text-slate-400">
              Unlocked badges, approaching goals, and streak progress.
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex flex-wrap gap-3">
          <StatChip label="Level" value={String(currentLevel)} color="#a855f7" />
          <StatChip label="Period XP" value={`${periodXP}`} color="#f59e0b" />
          <StatChip label="Total Badges" value={`${totalBadges}`} color="#06b6d4" />
          {dailyBrief && (
            <StatChip
              label="Streak"
              value={`${dailyBrief.streakStatus.currentStreak} days`}
              color={dailyBrief.streakStatus.isAtRisk ? '#ef4444' : '#10b981'}
            />
          )}
        </div>

        {/* Recent Achievements */}
        {recentAchievements.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Unlocked Achievements
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {recentAchievements.map((ach) => (
                <div
                  key={ach.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15"
                >
                  <span className="text-xl shrink-0">{ach.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-bold text-white truncate">{ach.name}</h5>
                    <p className="text-[10px] text-slate-400 truncate">Unlocked {ach.unlockedAt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approaching Milestones */}
        {approachingMilestones.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Approaching Milestones
            </h4>
            <div className="space-y-2">
              {approachingMilestones.map((ms, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5"
                >
                  <span className="text-xl shrink-0">{ms.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="text-xs font-bold text-white truncate">{ms.title}</h5>
                      <span
                        className="text-[10px] font-bold shrink-0"
                        style={{ color: ms.color }}
                      >
                        {ms.progressPct}%
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mb-1.5">{ms.description}</p>
                    <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${ms.progressPct}%`, background: ms.color }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/5 text-center">
      <span className="text-[9px] uppercase font-bold text-slate-500 block">{label}</span>
      <span className="text-sm font-extrabold" style={{ color, fontFamily: 'Space Grotesk' }}>
        {value}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 9: SYSTEM HEALTH (Collapsed by default)
// ═══════════════════════════════════════════════════════════════

const SystemHealth: React.FC<{ coach: UseCoachReturn }> = memo(function SystemHealth({ coach }) {
  const [expanded, setExpanded] = useState(false);
  const { coachHealth } = coach;

  const rows: Array<{ label: string; value: string; status: 'ok' | 'warn' | 'error' }> = [
    {
      label: 'Coach Engine',
      value: coachHealth.isHealthy ? 'Healthy' : 'Unhealthy',
      status: coachHealth.isHealthy ? 'ok' : 'error',
    },
    {
      label: 'Data Availability',
      value: coachHealth.hasData ? `${coachHealth.dataPoints} data points` : 'Insufficient data',
      status: coachHealth.hasData ? 'ok' : 'warn',
    },
    {
      label: 'Cache Version',
      value: COACH_INFRASTRUCTURE.CACHE_VERSION,
      status: 'ok',
    },
    {
      label: 'Cache TTL',
      value: `${COACH_INFRASTRUCTURE.DEFAULT_CACHE_TTL_MS / 1000}s`,
      status: 'ok',
    },
    {
      label: 'Max History Snapshots',
      value: `${COACH_INFRASTRUCTURE.MAX_HISTORY_SNAPSHOTS}`,
      status: 'ok',
    },
    {
      label: 'Scheduler Interval',
      value: `${COACH_INFRASTRUCTURE.DEFAULT_SCHEDULER_INTERVAL_MS / 1000}s`,
      status: 'ok',
    },
    {
      label: 'Predictions Confidence',
      value: coach.predictions?.confidence || 'N/A',
      status:
        coach.predictions?.confidence === 'high'
          ? 'ok'
          : coach.predictions?.confidence === 'medium'
          ? 'warn'
          : 'error',
    },
    {
      label: 'Risk Engine',
      value: coach.earlyRisks ? `Level: ${coach.earlyRisks.overallRiskLevel}` : 'Inactive',
      status: coach.earlyRisks ? 'ok' : 'warn',
    },
    {
      label: 'Habit Analysis',
      value: coach.habits ? 'Active' : 'Inactive',
      status: coach.habits ? 'ok' : 'warn',
    },
    {
      label: 'Behaviour Trends',
      value: coach.behaviourTrends
        ? `Momentum: ${coach.behaviourTrends.trendMomentumScore}`
        : 'Inactive',
      status: coach.behaviourTrends ? 'ok' : 'warn',
    },
    {
      label: 'Timeline Events',
      value: `${coach.timeline.length} events`,
      status: coach.timeline.length > 0 ? 'ok' : 'warn',
    },
    {
      label: 'Recommendations',
      value: `${coach.recommendations.length} active`,
      status: coach.recommendations.length > 0 ? 'ok' : 'warn',
    },
  ];

  if (coachHealth.error) {
    rows.push({
      label: 'Last Error',
      value: coachHealth.error,
      status: 'error',
    });
  }

  const statusColors: Record<string, string> = {
    ok: '#10b981',
    warn: '#f59e0b',
    error: '#ef4444',
  };

  return (
    <div className="glass-card overflow-hidden" role="region" aria-label="System Health">
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls="system-health-details"
        className="w-full p-5 flex items-center justify-between text-left hover:bg-white/[0.01] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="section-header-icon"
            style={{ background: 'rgba(148,163,184,0.1)' }}
          >
            <Server size={16} className="text-slate-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-300">System Health</h3>
            <p className="text-[11px] text-slate-500">
              Developer diagnostics — coach engine, cache, infrastructure status.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: coachHealth.isHealthy ? '#10b981' : '#ef4444',
              boxShadow: coachHealth.isHealthy
                ? '0 0 8px rgba(16,185,129,0.4)'
                : '0 0 8px rgba(239,68,68,0.4)',
            }}
          />
          <span className="text-[10px] font-bold text-slate-400">
            {coachHealth.isHealthy ? 'Healthy' : 'Degraded'}
          </span>
          {expanded ? (
            <ChevronUp size={14} className="text-slate-400" />
          ) : (
            <ChevronDown size={14} className="text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div
          id="system-health-details"
          className="px-5 pb-5 border-t border-white/5 animate-fadeIn"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-4">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: statusColors[row.status] }}
                  />
                  <span className="text-[11px] text-slate-400 truncate">{row.label}</span>
                </div>
                <span
                  className="text-[11px] font-bold shrink-0 ml-2 truncate max-w-[140px]"
                  style={{ color: statusColors[row.status] }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
