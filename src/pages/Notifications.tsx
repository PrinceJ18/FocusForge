/**
 * Intelligent Notification Center (Phase 3.10E)
 *
 * Proactively surfaces important coach insights, risks, milestones,
 * achievements, reminders, and recommendations using the AI Coach backend.
 *
 * Consumes data EXCLUSIVELY via a single `useCoach()` instance.
 * All read/dismissed state is local React state only — zero database writes.
 *
 * Sections:
 * 1. Today's Priority — highest-ranked recommendation with explainability
 * 2. Critical Alerts — active risk items (max 5)
 * 3. Achievements — recent unlocks and approaching milestones
 * 4. Behaviour Discoveries — habit analysis findings
 * 5. Prediction Alerts — forecast notifications
 * 6. Timeline Feed — chronological events grouped by day
 * 7. Notification Filters — local category filter pills
 * 8. Read State — unread / read / dismissed (local UI state)
 *
 * @module pages/Notifications
 */

import React, { memo, useMemo, useState, useCallback } from 'react';
import {
  Bell,
  Brain,
  ShieldAlert,
  Award,
  TrendingUp,
  Zap,
  Clock,
  Target,
  Sparkles,
  Calendar,
  Flame,
  Wallet,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  X,
  AlertTriangle,
  HelpCircle,
  Activity,
  Filter,
  Eye,
  EyeOff,
  Lightbulb,
  ShieldCheck,
} from 'lucide-react';
import { useCoach, type UseCoachReturn } from '../hooks/useCoach';
import type {
  CoachRecommendation,
  CoachRiskItem,
  CoachTimelineEvent,
} from '../lib/coach/coachTypes';

// ═══════════════════════════════════════════════════════════════
// Types & Constants
// ═══════════════════════════════════════════════════════════════

type NotificationFilter =
  | 'all'
  | 'critical'
  | 'recommendations'
  | 'achievements'
  | 'predictions'
  | 'habits'
  | 'timeline';

type ReadState = 'unread' | 'read' | 'dismissed';

interface NotificationItem {
  readonly id: string;
  readonly category: NotificationFilter;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly color: string;
  readonly severity?: 'critical' | 'high' | 'medium' | 'low';
  readonly timestamp?: string;
}

const FILTER_OPTIONS: Array<{ id: NotificationFilter; label: string; icon: React.ElementType }> = [
  { id: 'all', label: 'All', icon: Bell },
  { id: 'critical', label: 'Critical', icon: ShieldAlert },
  { id: 'recommendations', label: 'Recommendations', icon: Lightbulb },
  { id: 'achievements', label: 'Achievements', icon: Award },
  { id: 'predictions', label: 'Predictions', icon: Zap },
  { id: 'habits', label: 'Habits', icon: Activity },
  { id: 'timeline', label: 'Timeline', icon: Clock },
];

// ═══════════════════════════════════════════════════════════════
// Main Page Component
// ═══════════════════════════════════════════════════════════════

export default function Notifications() {
  const coach = useCoach();
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const markRead = useCallback((id: string) => {
    setReadIds(prev => new Set(prev).add(id));
  }, []);

  const markDismissed = useCallback((id: string) => {
    setDismissedIds(prev => new Set(prev).add(id));
  }, []);

  const getReadState = useCallback(
    (id: string): ReadState => {
      if (dismissedIds.has(id)) return 'dismissed';
      if (readIds.has(id)) return 'read';
      return 'unread';
    },
    [readIds, dismissedIds]
  );


  const showSection = (filter: NotificationFilter) =>
    activeFilter === 'all' || activeFilter === filter;

  return (
    <div className="page-enter space-y-6 text-left pb-16">

      {/* ═══ SECTION 7: NOTIFICATION FILTERS ═══ */}
      <NotificationFilterBar activeFilter={activeFilter} onFilterChange={setActiveFilter} />

      {/* ═══ SECTION 1: TODAY'S PRIORITY ═══ */}
      {showSection('recommendations') && (
        <TodaysPriority
          coach={coach}
          getReadState={getReadState}
          onRead={markRead}
          onDismiss={markDismissed}
        />
      )}

      {/* ═══ SECTION 2: CRITICAL ALERTS ═══ */}
      {showSection('critical') && (
        <CriticalAlerts
          coach={coach}
          getReadState={getReadState}
          onRead={markRead}
          onDismiss={markDismissed}
        />
      )}

      {/* ═══ SECTION 3: ACHIEVEMENTS ═══ */}
      {showSection('achievements') && (
        <AchievementsSection
          coach={coach}
          getReadState={getReadState}
          onRead={markRead}
          onDismiss={markDismissed}
        />
      )}

      {/* ═══ SECTION 4: BEHAVIOUR DISCOVERIES ═══ */}
      {showSection('habits') && (
        <BehaviourDiscoveries
          coach={coach}
          getReadState={getReadState}
          onRead={markRead}
          onDismiss={markDismissed}
        />
      )}

      {/* ═══ SECTION 5: PREDICTION ALERTS ═══ */}
      {showSection('predictions') && (
        <PredictionAlerts
          coach={coach}
          getReadState={getReadState}
          onRead={markRead}
          onDismiss={markDismissed}
        />
      )}

      {/* ═══ SECTION 6: TIMELINE FEED ═══ */}
      {showSection('timeline') && (
        <TimelineFeed
          coach={coach}
          getReadState={getReadState}
          onRead={markRead}
          onDismiss={markDismissed}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHARED PROPS & UTILITIES
// ═══════════════════════════════════════════════════════════════

interface SectionProps {
  coach: UseCoachReturn;
  getReadState: (id: string) => ReadState;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

function NotifActions({
  id,
  state,
  onRead,
  onDismiss,
}: {
  id: string;
  state: ReadState;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  if (state === 'dismissed') return null;

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {state === 'unread' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRead(id);
          }}
          className="p-1 rounded-md hover:bg-background-card-hover text-text-muted hover:text-text-primary transition-colors"
          title="Mark as read"
          aria-label="Mark as read"
        >
          <Eye size={13} />
        </button>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(id);
        }}
        className="p-1 rounded-md hover:bg-background-card-hover text-text-muted hover:text-text-secondary transition-colors"
        title="Dismiss"
        aria-label="Dismiss notification"
      >
        <X size={13} />
      </button>
    </div>
  );
}

function UnreadDot({ state }: { state: ReadState }) {
  if (state !== 'unread') return null;
  return (
    <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0 animate-pulse" />
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 7: FILTER BAR
// ═══════════════════════════════════════════════════════════════

const NotificationFilterBar: React.FC<{
  activeFilter: NotificationFilter;
  onFilterChange: (filter: NotificationFilter) => void;
}> = memo(function NotificationFilterBar({ activeFilter, onFilterChange }) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label="Notification category filters"
    >
      {FILTER_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isActive = activeFilter === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onFilterChange(opt.id)}
            role="tab"
            aria-selected={isActive}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              isActive
                ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                : 'bg-white/[0.02] text-text-muted border-border hover:bg-white/[0.04] hover:text-text-primary'
            }`}
          >
            <Icon size={13} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════
// SECTION 1: TODAY'S PRIORITY
// ═══════════════════════════════════════════════════════════════

const TodaysPriority: React.FC<SectionProps> = memo(function TodaysPriority({
  coach,
  getReadState,
  onRead,
  onDismiss,
}) {
  const [expanded, setExpanded] = useState(false);
  const topRec = coach.recommendations[0];
  if (!topRec) return null;

  const notifId = `priority-${topRec.id}`;
  const state = getReadState(notifId);
  if (state === 'dismissed') return null;

  return (
    <div
      className="glass-card overflow-hidden"
      role="region"
      aria-label="Today's Priority"
      style={{ border: '1px solid rgba(168,85,247,0.2)' }}
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="section-header mb-0">
            <div
              className="section-header-icon"
              style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
            >
              <Target size={16} className="text-text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Today's Priority</h3>
              <p className="text-[11px] text-text-muted">Your highest-leverage action right now.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <UnreadDot state={state} />
            <NotifActions id={notifId} state={state} onRead={onRead} onDismiss={onDismiss} />
          </div>
        </div>

        <button
          onClick={() => {
            setExpanded(!expanded);
            if (state === 'unread') onRead(notifId);
          }}
          aria-expanded={expanded}
          aria-controls="priority-details"
          className="w-full text-left"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl shrink-0">{topRec.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className="text-sm font-bold text-text-primary truncate">{topRec.title}</h4>
                <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  {topRec.priority}
                </span>
              </div>
              <p className="text-xs text-text-secondary">{topRec.description}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 text-purple-400 text-xs font-semibold">
              <HelpCircle size={14} />
              <span className="hidden sm:inline">Why?</span>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </div>
        </button>
      </div>

      {/* EXPANDABLE EXPLAINABILITY */}
      {expanded && topRec.explainability && (
        <div
          id="priority-details"
          className="p-5 bg-slate-900/90 border-t border-border space-y-3 text-xs animate-fadeIn"
        >
          <div>
            <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider block mb-0.5">
              Causal Reason
            </span>
            <p className="text-text-primary leading-relaxed">{topRec.explainability.why}</p>
          </div>

          {topRec.explainability.triggerMetrics.length > 0 && (
            <div>
              <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider block mb-1">
                Trigger Metrics
              </span>
              <div className="flex flex-wrap gap-1.5">
                {topRec.explainability.triggerMetrics.map((tm, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-background-card-hover border border-border text-text-secondary text-[11px]"
                  >
                    {tm.label}: {tm.current}{tm.unit}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
            {topRec.explainability.expectedImprovement && (
              <div>
                <span className="text-[10px] text-text-muted block">Expected Improvement</span>
                <span className="font-semibold text-emerald-400">{topRec.explainability.expectedImprovement}</span>
              </div>
            )}
            <div>
              <span className="text-[10px] text-text-muted block mb-0.5">Confidence Level</span>
              <span className="font-semibold text-cyan-400 text-[11px] capitalize">
                {topRec.confidence || 'Medium'} Confidence
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════
// SECTION 2: CRITICAL ALERTS
// ═══════════════════════════════════════════════════════════════

const CriticalAlerts: React.FC<SectionProps> = memo(function CriticalAlerts({
  coach,
  getReadState,
  onRead,
  onDismiss,
}) {
  const [expandedRiskId, setExpandedRiskId] = useState<string | null>(null);
  const risks = coach.riskAssessment.slice(0, 5);

  const visibleRisks = risks.filter(r => getReadState(`risk-${r.id}`) !== 'dismissed');
  if (visibleRisks.length === 0 && risks.length === 0) return null;

  return (
    <div className="glass-card p-5 space-y-4" role="region" aria-label="Critical Alerts">
      <div className="flex items-center justify-between">
        <div className="section-header mb-0">
          <div
            className="section-header-icon"
            style={{ background: 'rgba(239,68,68,0.15)' }}
          >
            <ShieldAlert size={16} style={{ color: '#ef4444' }} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Critical Alerts</h3>
            <p className="text-[11px] text-text-muted">
              Active risks detected by the Early Risk Engine.
            </p>
          </div>
        </div>
        <span className="text-[10px] text-text-muted font-semibold">
          {visibleRisks.length} active
        </span>
      </div>

      <div className="space-y-2.5">
        {visibleRisks.length > 0 ? (
          visibleRisks.map((risk) => {
            const notifId = `risk-${risk.id}`;
            const state = getReadState(notifId);
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
                className={`rounded-xl border bg-white/[0.02] overflow-hidden transition-all ${
                  state === 'unread' ? 'border-red-500/20' : 'border-border'
                }`}
              >
                <button
                  onClick={() => {
                    setExpandedRiskId(prev => (prev === risk.id ? null : risk.id));
                    if (state === 'unread') onRead(notifId);
                  }}
                  aria-expanded={isExpanded}
                  aria-controls={`notif-risk-${risk.id}`}
                  className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UnreadDot state={state} />
                    <span className="text-base shrink-0">{risk.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h5 className="text-xs font-bold text-text-primary truncate">{risk.title}</h5>
                        <span
                          className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full border ${severityStyle}`}
                        >
                          {risk.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary truncate mt-0.5">{risk.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <NotifActions id={notifId} state={state} onRead={onRead} onDismiss={onDismiss} />
                    {isExpanded ? (
                      <ChevronUp size={14} className="text-text-muted" />
                    ) : (
                      <ChevronDown size={14} className="text-text-muted" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div
                    id={`notif-risk-${risk.id}`}
                    className="p-4 bg-slate-900/90 border-t border-border space-y-2 text-xs animate-fadeIn"
                  >
                    <div className="grid grid-cols-2 gap-2 pb-2 border-b border-border">
                      <div>
                        <span className="text-text-muted block text-[10px]">Severity:</span>
                        <span className="font-bold text-red-400 capitalize">{risk.severity}</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px]">Probability:</span>
                        <span className="font-bold text-amber-400 capitalize">
                          {risk.probability || 'High'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-text-muted block mb-1">
                        Impact Assessment
                      </span>
                      <p className="text-text-secondary text-[11px] leading-relaxed">{risk.description}</p>
                    </div>
                    {risk.suggestedAction && (
                      <div className="pt-2 border-t border-border">
                        <span className="text-[10px] uppercase font-bold text-emerald-500 block mb-1">
                          Suggested Mitigation
                        </span>
                        <p className="text-text-primary text-[11px] font-semibold">{risk.suggestedAction}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-3">
            <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
            <div>
              <span className="text-xs font-bold text-emerald-400 block">All Clear</span>
              <span className="text-[11px] text-text-muted">
                No critical risks or performance anomalies detected.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════
// SECTION 3: ACHIEVEMENTS
// ═══════════════════════════════════════════════════════════════

const AchievementsSection: React.FC<SectionProps> = memo(function AchievementsSection({
  coach,
  getReadState,
  onRead,
  onDismiss,
}) {
  const { achievementsSummary } = coach;
  if (!achievementsSummary) return null;

  const recentAchs = achievementsSummary.recentAchievements;
  const milestones = achievementsSummary.approachingMilestones;

  const visibleAchs = recentAchs.filter(a => getReadState(`ach-${a.id}`) !== 'dismissed');
  const visibleMilestones = milestones.filter(
    (_, i) => getReadState(`milestone-${i}`) !== 'dismissed'
  );

  if (visibleAchs.length === 0 && visibleMilestones.length === 0) return null;

  return (
    <div className="glass-card p-5 space-y-4" role="region" aria-label="Achievements">
      <div className="section-header mb-0">
        <div
          className="section-header-icon"
          style={{ background: 'rgba(245,158,11,0.15)' }}
        >
          <Award size={16} style={{ color: '#f59e0b' }} />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-100">Achievements & Milestones</h3>
          <p className="text-[11px] text-text-muted">
            Recent unlocks and approaching personal milestones.
          </p>
        </div>
      </div>

      {visibleAchs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
            Recent Unlocks
          </h4>
          {visibleAchs.map((ach) => {
            const notifId = `ach-${ach.id}`;
            const state = getReadState(notifId);
            return (
              <div
                key={ach.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  state === 'unread'
                    ? 'bg-amber-500/5 border-amber-500/20'
                    : 'bg-white/[0.02] border-border'
                }`}
                onClick={() => state === 'unread' && onRead(notifId)}
              >
                <UnreadDot state={state} />
                <span className="text-xl shrink-0">{ach.icon}</span>
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-bold text-text-primary truncate">{ach.name}</h5>
                  <p className="text-[10px] text-text-muted truncate">
                    Unlocked {ach.unlockedAt}
                  </p>
                </div>
                <NotifActions id={notifId} state={state} onRead={onRead} onDismiss={onDismiss} />
              </div>
            );
          })}
        </div>
      )}

      {visibleMilestones.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
            Approaching Milestones
          </h4>
          {visibleMilestones.map((ms, idx) => {
            const notifId = `milestone-${idx}`;
            const state = getReadState(notifId);
            return (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-border"
                onClick={() => state === 'unread' && onRead(notifId)}
              >
                <UnreadDot state={state} />
                <span className="text-xl shrink-0">{ms.icon}</span>
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-bold text-text-primary truncate">{ms.title}</h5>
                  <p className="text-[10px] text-text-muted">{ms.description}</p>
                  <div className="w-full bg-slate-800/80 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${ms.progressPct}%`,
                        background: ms.color,
                      }}
                    />
                  </div>
                </div>
                <span
                  className="text-[10px] font-bold shrink-0"
                  style={{ color: ms.color }}
                >
                  {ms.progressPct}%
                </span>
                <NotifActions id={notifId} state={state} onRead={onRead} onDismiss={onDismiss} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════
// SECTION 4: BEHAVIOUR DISCOVERIES
// ═══════════════════════════════════════════════════════════════

const BehaviourDiscoveries: React.FC<SectionProps> = memo(function BehaviourDiscoveries({
  coach,
  getReadState,
  onRead,
  onDismiss,
}) {
  const { habits } = coach;
  if (!habits) return null;

  const discoveries = [
    {
      id: 'habit-best-day',
      icon: Calendar,
      label: 'Best Focus Weekday',
      value: habits.bestWeekday.dayName,
      detail: `${habits.bestWeekday.avgFocusMinutes}m average focus on ${habits.bestWeekday.dayName}s.`,
      color: '#a855f7',
    },
    {
      id: 'habit-focus-window',
      icon: Clock,
      label: 'Peak Focus Window',
      value: habits.bestFocusHour.timeWindow,
      detail: 'Highest sustained flow-state block identified.',
      color: '#06b6d4',
    },
    {
      id: 'habit-weekend',
      icon: Wallet,
      label: 'Weekend Dynamics',
      value: `${habits.weekendBehaviour.spendRatioWeekendToWeekday}x Weekday Spend`,
      detail: habits.weekendBehaviour.pattern === 'high_spending_weekend'
        ? 'Spending increases significantly on weekends.'
        : 'Weekend spending remains balanced with weekday patterns.',
      color: habits.weekendBehaviour.pattern === 'high_spending_weekend' ? '#f59e0b' : '#10b981',
    },
    {
      id: 'habit-consistency',
      icon: Flame,
      label: 'Consistency Score',
      value: `${habits.consistencyScore}%`,
      detail: `Your overall habit adherence rate is ${habits.consistencyScore}%.`,
      color: '#ec4899',
    },
  ];

  const visible = discoveries.filter(d => getReadState(d.id) !== 'dismissed');
  if (visible.length === 0) return null;

  return (
    <div className="glass-card p-5 space-y-4" role="region" aria-label="Behaviour Discoveries">
      <div className="section-header mb-0">
        <div
          className="section-header-icon"
          style={{ background: 'rgba(6,182,212,0.15)' }}
        >
          <Brain size={16} style={{ color: '#06b6d4' }} />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-100">Behaviour Discoveries</h3>
          <p className="text-[11px] text-text-muted">
            Patterns discovered across focus windows, weekday trends, and spending.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visible.map((disc) => {
          const Icon = disc.icon;
          const state = getReadState(disc.id);
          return (
            <div
              key={disc.id}
              className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                state === 'unread'
                  ? 'bg-cyan-500/5 border-cyan-500/15'
                  : 'bg-white/[0.02] border-border'
              }`}
              onClick={() => state === 'unread' && onRead(disc.id)}
            >
              <UnreadDot state={state} />
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: `${disc.color}15`, color: disc.color }}
              >
                <Icon size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                    {disc.label}
                  </span>
                </div>
                <div
                  className="text-sm font-bold truncate"
                  style={{ color: disc.color, fontFamily: 'Space Grotesk' }}
                >
                  {disc.value}
                </div>
                <p className="text-[10px] text-text-muted mt-0.5">{disc.detail}</p>
              </div>
              <NotifActions id={disc.id} state={state} onRead={onRead} onDismiss={onDismiss} />
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════
// SECTION 5: PREDICTION ALERTS
// ═══════════════════════════════════════════════════════════════

const PredictionAlerts: React.FC<SectionProps> = memo(function PredictionAlerts({
  coach,
  getReadState,
  onRead,
  onDismiss,
}) {
  const { predictions } = coach;
  if (!predictions) return null;

  const alerts = [
    {
      id: 'pred-productivity',
      icon: TrendingUp,
      title: 'Productivity Forecast',
      description: `Expected productivity score: ${predictions.expectedProductivityScore}/100.`,
      color: '#a855f7',
    },
    {
      id: 'pred-grade',
      icon: Award,
      title: 'Weekly Grade Trajectory',
      description: `On track for Grade ${predictions.expectedWeeklyGrade || 'A'} this week.`,
      color: '#06b6d4',
    },
    {
      id: 'pred-budget',
      icon: Wallet,
      title: 'Budget Runway',
      description:
        predictions.daysUntilBudgetDepleted !== null && predictions.daysUntilBudgetDepleted !== undefined
          ? `Budget estimated to last ${predictions.daysUntilBudgetDepleted} more days.`
          : 'Budget remains within safe limits.',
      color:
        predictions.daysUntilBudgetDepleted !== null &&
        predictions.daysUntilBudgetDepleted !== undefined &&
        predictions.daysUntilBudgetDepleted < 10
          ? '#ef4444'
          : '#10b981',
    },
    {
      id: 'pred-momentum',
      icon: Zap,
      title: 'Focus Momentum',
      description: predictions.focusMomentumFactor
        ? `Current velocity factor: ${Math.round(predictions.focusMomentumFactor * 100)}% pace.`
        : `Projected monthly focus: ${Math.round(predictions.expectedMonthlyFocusMinutes / 60)} hours.`,
      color: '#f59e0b',
    },
  ];

  const visible = alerts.filter(a => getReadState(a.id) !== 'dismissed');
  if (visible.length === 0) return null;

  return (
    <div className="glass-card p-5 space-y-4" role="region" aria-label="Prediction Alerts">
      <div className="flex items-center justify-between">
        <div className="section-header mb-0">
          <div
            className="section-header-icon"
            style={{ background: 'rgba(168,85,247,0.15)' }}
          >
            <Zap size={16} style={{ color: '#a855f7' }} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Prediction Alerts</h3>
            <p className="text-[11px] text-text-muted">
              Deterministic forecasts from the Prediction Engine.
            </p>
          </div>
        </div>
        <span className="text-[10px] uppercase font-bold text-purple-400 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">
          {predictions.confidence} Confidence
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visible.map((alert) => {
          const Icon = alert.icon;
          const state = getReadState(alert.id);
          return (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                state === 'unread'
                  ? 'bg-purple-500/5 border-purple-500/15'
                  : 'bg-white/[0.02] border-border'
              }`}
              onClick={() => state === 'unread' && onRead(alert.id)}
            >
              <UnreadDot state={state} />
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: `${alert.color}15`, color: alert.color }}
              >
                <Icon size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-xs font-bold text-text-primary truncate">{alert.title}</h5>
                <p className="text-[10px] text-text-secondary mt-0.5 leading-relaxed">
                  {alert.description}
                </p>
              </div>
              <NotifActions id={alert.id} state={state} onRead={onRead} onDismiss={onDismiss} />
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════
// SECTION 6: TIMELINE FEED (GROUPED BY DAY)
// ═══════════════════════════════════════════════════════════════

const TimelineFeed: React.FC<SectionProps> = memo(function TimelineFeed({
  coach,
  getReadState,
  onRead,
  onDismiss,
}) {
  const { timeline } = coach;
  const events = timeline.slice(0, 20);

  if (events.length === 0) return null;

  const grouped = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const groups: { label: string; events: typeof events }[] = [
      { label: 'Today', events: [] },
      { label: 'Yesterday', events: [] },
      { label: 'Earlier', events: [] },
    ];

    events.forEach((evt) => {
      const tf = evt.timestamp?.toLowerCase() || '';
      if (tf.includes('today') || tf.includes('this morning') || tf.includes('this afternoon')) {
        groups[0].events.push(evt);
      } else if (tf.includes('yesterday')) {
        groups[1].events.push(evt);
      } else {
        groups[2].events.push(evt);
      }
    });

    return groups.filter((g) => g.events.length > 0);
  }, [events]);

  const visibleGrouped = grouped
    .map((g) => ({
      ...g,
      events: g.events.filter((evt) => getReadState(`tl-${evt.id}`) !== 'dismissed'),
    }))
    .filter((g) => g.events.length > 0);

  if (visibleGrouped.length === 0) return null;

  return (
    <div className="glass-card p-5 space-y-4" role="region" aria-label="Timeline Feed">
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

      {visibleGrouped.map((group) => (
        <div key={group.label} className="space-y-2.5">
          <h4 className="text-[10px] uppercase font-bold text-text-muted tracking-wider pl-1">
            {group.label}
          </h4>
          <div className="space-y-2 relative pl-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-background-card-hover">
            {group.events.map((evt) => {
              const notifId = `tl-${evt.id}`;
              const state = getReadState(notifId);
              return (
                <div
                  key={evt.id}
                  className="relative flex items-start gap-3 text-xs"
                  onClick={() => state === 'unread' && onRead(notifId)}
                >
                  <div
                    className={`w-3 h-3 rounded-full border shrink-0 mt-0.5 -ml-[19px] ${
                      state === 'unread'
                        ? 'bg-purple-500/60 border-purple-400'
                        : 'bg-slate-700/60 border-slate-500'
                    }`}
                  />
                  <div
                    className={`flex-1 min-w-0 p-3 rounded-xl border transition-all ${
                      state === 'unread'
                        ? 'bg-purple-500/5 border-purple-500/15'
                        : 'bg-white/[0.02] border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <UnreadDot state={state} />
                        <span className="font-semibold text-text-primary truncate group-hover:text-purple-400 transition-colors">{evt.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-text-muted shrink-0 whitespace-nowrap">{evt.timestamp}</span>
                        <NotifActions
                          id={notifId}
                          state={state}
                          onRead={onRead}
                          onDismiss={onDismiss}
                        />
                      </div>
                    </div>
                    <p className="text-text-secondary text-[11px] leading-relaxed">{evt.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
});
