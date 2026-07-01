import { useState, useMemo } from 'react';
import { Settings, ChevronDown, ChevronUp, Minus, Plus, Check } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useDailyGoalsStore } from '../store/useDailyGoalsStore';
import {
  computeOverallProgress,
  getEnabledGoalProgresses,
  formatGoalValue,
  formatGoalTarget,
  getSmartRecommendations,
} from '../lib/dailyGoalsUtils';
import GoalSettingsModal from './GoalSettingsModal';

// ============================================================
// Today's Goals Card — Dashboard Integration
// ============================================================

export default function TodaysGoalsCard() {
  const { focusSessions, tasks, expenses, profile } = useStore();
  const {
    goalConfigs,
    customGoalProgress,
    dailyXPStart,
    dailyXPDate,
    history,
    updateCustomGoalProgress,
  } = useDailyGoalsStore();

  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const progressParams = useMemo(() => ({
    focusSessions,
    tasks,
    expenses,
    profile,
    customGoalProgress,
    dailyXPStart,
    dailyXPDate,
  }), [focusSessions, tasks, expenses, profile, customGoalProgress, dailyXPStart, dailyXPDate]);

  const overall = useMemo(
    () => computeOverallProgress(goalConfigs, progressParams),
    [goalConfigs, progressParams]
  );

  const goalProgresses = useMemo(
    () => getEnabledGoalProgresses(goalConfigs, progressParams),
    [goalConfigs, progressParams]
  );

  const recommendations = useMemo(
    () => getSmartRecommendations(history, goalConfigs),
    [history, goalConfigs]
  );

  const recentHistory = history.slice(0, 7);
  const allComplete = overall.total > 0 && overall.completed === overall.total;

  if (goalProgresses.length === 0) return null;

  return (
    <>
      <div
        className="glass-card p-5 sm:p-6 relative overflow-hidden"
        style={{
          background: allComplete
            ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.08))'
            : 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(236,72,153,0.05))',
          transition: 'background 0.6s ease',
        }}
      >
        {/* Decorative glow */}
        <div
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-15"
          style={{
            background: allComplete
              ? 'radial-gradient(circle, #10b981, transparent)'
              : 'radial-gradient(circle, #a855f7, transparent)',
            transition: 'background 0.6s ease',
          }}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{
                background: allComplete
                  ? 'linear-gradient(135deg, #10b981, #06b6d4)'
                  : 'linear-gradient(135deg, #a855f7, #ec4899)',
                boxShadow: allComplete
                  ? '0 0 20px rgba(16,185,129,0.3)'
                  : '0 0 20px rgba(168,85,247,0.3)',
              }}
            >
              {allComplete ? '🏆' : '🎯'}
            </div>
            <div>
              <h3 className="font-bold text-base" style={{ fontFamily: 'Space Grotesk', color: 'var(--text-primary)' }}>
                Today's Goals
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {overall.completed} / {overall.total} Completed
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-xl transition-all hover:bg-white/5"
            style={{ color: 'var(--text-muted)' }}
            title="Goal Settings"
          >
            <Settings size={18} />
          </button>
        </div>

        {/* Overall progress bar */}
        <div className="relative z-10 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-black" style={{ fontFamily: 'Space Grotesk', color: 'var(--text-primary)' }}>
              {overall.pct}%
            </span>
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              {overall.motivationMessage}
            </span>
          </div>
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ height: 10, background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="h-full rounded-full goal-progress-fill"
              style={{
                width: `${overall.pct}%`,
                background: allComplete
                  ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                  : 'linear-gradient(90deg, #a855f7, #ec4899)',
                boxShadow: allComplete
                  ? '0 0 12px rgba(16,185,129,0.5)'
                  : '0 0 12px rgba(168,85,247,0.5)',
                transition: 'width 0.8s ease, background 0.6s ease',
              }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="relative z-10 grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="text-sm font-bold" style={{ color: '#a855f7', fontFamily: 'Space Grotesk' }}>
              {overall.total - overall.completed}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Remaining</div>
          </div>
          <div className="text-center p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="text-sm font-bold" style={{ color: '#10b981', fontFamily: 'Space Grotesk' }}>
              {overall.completed}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Done</div>
          </div>
          <div className="text-center p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="text-sm font-bold" style={{ color: '#f59e0b', fontFamily: 'Space Grotesk' }}>
              {overall.remainingMinutes > 0 ? `${overall.remainingMinutes}m` : '—'}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Est. Time</div>
          </div>
        </div>

        {/* Individual goals */}
        <div className="relative z-10 space-y-2">
          {goalProgresses.map((goal) => (
            <GoalRow
              key={goal.id}
              goal={goal}
              onUpdateCustom={
                goal.type === 'custom'
                  ? (val: number) => updateCustomGoalProgress(goal.id, val)
                  : undefined
              }
              customValue={goal.type === 'custom' ? (customGoalProgress[goal.id] || 0) : undefined}
            />
          ))}
        </div>

        {/* Smart Recommendations */}
        {recommendations.length > 0 && (
          <div className="relative z-10 mt-4">
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              Smart Suggestions
            </p>
            <div className="space-y-1.5">
              {recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 rounded-lg text-xs"
                  style={{
                    background: `${rec.color}08`,
                    border: `1px solid ${rec.color}15`,
                    borderRadius: 8,
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span>{rec.icon}</span>
                  <span>{rec.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History toggle */}
        {recentHistory.length > 0 && (
          <div className="relative z-10 mt-4">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1 text-xs font-medium transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              Recent History
              {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showHistory && (
              <div className="mt-2 space-y-1.5">
                {recentHistory.map((entry) => (
                  <div
                    key={entry.date}
                    className="flex items-center gap-3 py-1"
                  >
                    <span className="text-xs font-medium w-14 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                      {formatHistoryDate(entry.date)}
                    </span>
                    <div className="flex-1">
                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.06)' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${entry.completionPct}%`,
                            background: entry.completionPct >= 100
                              ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                              : entry.completionPct >= 60
                                ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                                : 'linear-gradient(90deg, #ef4444, #f87171)',
                            transition: 'width 0.5s ease',
                          }}
                        />
                      </div>
                    </div>
                    <span
                      className="text-xs font-bold w-10 text-right flex-shrink-0"
                      style={{
                        color: entry.completionPct >= 100
                          ? '#10b981'
                          : entry.completionPct >= 60
                            ? '#f59e0b'
                            : '#ef4444',
                      }}
                    >
                      {entry.completionPct}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* All complete celebration */}
        {allComplete && (
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{ borderRadius: 16 }}
          >
            <div className="goal-complete-particles" />
          </div>
        )}
      </div>

      {/* Settings modal */}
      {showSettings && <GoalSettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}

// ============================================================
// Individual Goal Row
// ============================================================

function GoalRow({
  goal,
  onUpdateCustom,
  customValue,
}: {
  goal: {
    id: string;
    name: string;
    icon: string;
    color: string;
    target: number;
    current: number;
    pct: number;
    completed: boolean;
    unit: string;
    type: string;
  };
  onUpdateCustom?: (val: number) => void;
  customValue?: number;
}) {
  const isCheckbox = goal.unit === 'checkbox';
  const isBudget = goal.type === 'budget';

  return (
    <div
      className="goal-item flex items-center gap-3 p-2.5 rounded-xl transition-all"
      style={{
        background: goal.completed ? `${goal.color}08` : 'rgba(255,255,255,0.02)',
        border: `1px solid ${goal.completed ? `${goal.color}20` : 'rgba(255,255,255,0.05)'}`,
        borderRadius: 10,
      }}
    >
      {/* Icon / Checkbox */}
      {isCheckbox && onUpdateCustom ? (
        <button
          onClick={() => onUpdateCustom(goal.completed ? 0 : 1)}
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
          style={{
            background: goal.completed ? `${goal.color}25` : 'rgba(255,255,255,0.05)',
            border: `1px solid ${goal.completed ? `${goal.color}50` : 'rgba(255,255,255,0.1)'}`,
            color: goal.completed ? goal.color : 'var(--text-muted)',
          }}
        >
          {goal.completed ? <Check size={14} /> : null}
        </button>
      ) : (
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
          style={{ background: `${goal.color}15` }}
        >
          {goal.completed ? <Check size={14} style={{ color: goal.color }} /> : goal.icon}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span
            className="text-xs font-medium truncate"
            style={{
              color: goal.completed ? goal.color : 'var(--text-primary)',
              textDecoration: goal.completed && isCheckbox ? 'line-through' : 'none',
            }}
          >
            {goal.name}
          </span>
          <span className="text-xs font-medium flex-shrink-0 ml-2" style={{ color: goal.color }}>
            {isCheckbox
              ? (goal.completed ? '✓' : '')
              : isBudget
                ? `₹${goal.current} / ₹${goal.target}`
                : `${formatGoalValue(goal.current, goal.unit, goal.type as any)} / ${formatGoalTarget(goal.target, goal.unit, goal.type as any)}`}
          </span>
        </div>

        {/* Progress bar (non-checkbox goals) */}
        {!isCheckbox && (
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ height: 4, background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${goal.pct}%`,
                background: goal.completed
                  ? goal.color
                  : `${goal.color}cc`,
                transition: 'width 0.6s ease',
              }}
            />
          </div>
        )}
      </div>

      {/* Custom goal controls (count type) */}
      {goal.type === 'custom' && !isCheckbox && onUpdateCustom && customValue !== undefined && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onUpdateCustom(Math.max(0, customValue - 1))}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:bg-white/5"
            style={{ color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Minus size={10} />
          </button>
          <button
            onClick={() => onUpdateCustom(customValue + 1)}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:bg-white/5"
            style={{ color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Plus size={10} />
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function formatHistoryDate(dateStr: string): string {
  try {
    const [, m, d] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${parseInt(d)} ${months[parseInt(m) - 1]}`;
  } catch {
    return dateStr;
  }
}
