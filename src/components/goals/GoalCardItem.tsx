import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Plus,
  Edit3,
  Trash2,
  Trophy,
  Sparkles,
  Shield,
  Loader2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import GoalMilestoneItem from './GoalMilestoneItem';
import {
  calculateGoalMilestoneProgress,
  getEffectiveGoalStatus,
  formatGoalPeriod,
  isBonusEligible,
} from './goalsUiUtils';
import type { Goal, GoalMilestone } from '../../types/goals';
import type { Task } from '../../store/slices/types';

interface GoalCardItemProps {
  goal: Goal;
  milestones: GoalMilestone[];
  tasks: Task[];
  onEditGoal: (goal: Goal) => void;
  onDeleteGoal: (goal: Goal) => void;
  onCompleteGoal: (goal: Goal) => void;
  onAddMilestone: (goalId: string) => void;
  onEditMilestone: (milestone: GoalMilestone) => void;
  onToggleMilestone: (milestoneId: string, currentCompleted: boolean) => Promise<void>;
  onDeleteMilestone: (milestoneId: string) => Promise<void>;
  onUpdateManualProgress: (goalId: string, pct: number) => Promise<void>;
  onUpdateDeadline: (goalId: string, deadline: string | null) => Promise<void>;
}

export default function GoalCardItem({
  goal,
  milestones,
  tasks,
  onEditGoal,
  onDeleteGoal,
  onCompleteGoal,
  onAddMilestone,
  onEditMilestone,
  onToggleMilestone,
  onDeleteMilestone,
  onUpdateManualProgress,
  onUpdateDeadline,
}: GoalCardItemProps) {
  const [expanded, setExpanded] = useState(true);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [newDeadlineVal, setNewDeadlineVal] = useState(goal.deadline ?? '');
  const [savingDeadline, setSavingDeadline] = useState(false);
  const [manualSliderVal, setManualSliderVal] = useState(goal.manual_progress_pct);
  const [savingManualProgress, setSavingManualProgress] = useState(false);

  // Status & progress calculations
  const effective = getEffectiveGoalStatus(goal);
  const milestoneProgress = calculateGoalMilestoneProgress(goal.id, milestones);
  const isCompleted = goal.status === 'completed';

  const progressPercentage =
    goal.progress_method === 'milestone'
      ? milestoneProgress.percentage
      : goal.manual_progress_pct;

  const isEligibleForCompletion =
    goal.progress_method === 'milestone'
      ? milestoneProgress.total === 0 || milestoneProgress.completed === milestoneProgress.total
      : goal.manual_progress_pct === 100;

  const bonusValid = isBonusEligible(goal);

  // Filter tasks map for fast lookup
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  // Goal milestones sorted
  const goalMilestones = milestones
    .filter((m) => m.goal_id === goal.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  // Save manual progress
  const handleManualProgressChange = async (newVal: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newVal)));
    setManualSliderVal(clamped);
    if (clamped !== goal.manual_progress_pct) {
      try {
        setSavingManualProgress(true);
        await onUpdateManualProgress(goal.id, clamped);
      } finally {
        setSavingManualProgress(false);
      }
    }
  };

  // Save deadline update
  const handleSaveDeadline = async () => {
    try {
      setSavingDeadline(true);
      await onUpdateDeadline(goal.id, newDeadlineVal || null);
      setEditingDeadline(false);
    } finally {
      setSavingDeadline(false);
    }
  };

  return (
    <div
      className={`relative rounded-2xl border transition-all duration-300 p-5 ${
        isCompleted
          ? 'bg-background-card/40 border-emerald-500/30'
          : effective.isDelayed
          ? 'bg-background-card border-amber-500/40 shadow-sm shadow-amber-500/5'
          : 'bg-background-card border-border hover:border-border/80'
      }`}
    >
      {/* ═══ Header: Badges + Title + Action Menu ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Badge */}
            {isCompleted ? (
              <Badge variant="success" size="sm" icon={CheckCircle2}>
                Completed
              </Badge>
            ) : effective.isDelayed ? (
              <Badge variant="warning" size="sm" icon={AlertTriangle}>
                Delayed ({effective.daysOverdue}d overdue)
              </Badge>
            ) : (
              <Badge variant="purple" size="sm">
                Active
              </Badge>
            )}

            {/* Period Badge */}
            <Badge variant="default" size="sm">
              {formatGoalPeriod(goal.period)}
            </Badge>

            {/* Strict Badge */}
            {goal.is_strict && (
              <Badge variant="warning" size="sm" icon={Shield}>
                Strict
              </Badge>
            )}

            {/* Progress Method Badge */}
            <span className="text-[10px] text-text-muted px-2 py-0.5 rounded-full bg-background-card-hover border border-border">
              {goal.progress_method === 'milestone' ? 'Milestone Track' : 'Manual Progress'}
            </span>
          </div>

          <h4
            className="text-base font-bold text-text-primary leading-tight mt-1"
            style={{ fontFamily: 'Space Grotesk' }}
          >
            {goal.title}
          </h4>

          {goal.description && (
            <p className="text-xs text-text-muted line-clamp-2 mt-0.5">
              {goal.description}
            </p>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5 self-end sm:self-start flex-shrink-0">
          {!isCompleted && (
            <>
              <button
                type="button"
                onClick={() => onEditGoal(goal)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-background-card-hover border border-transparent hover:border-border transition-all"
                title="Edit goal"
                aria-label="Edit goal"
              >
                <Edit3 size={14} />
              </button>
              <button
                type="button"
                onClick={() => onDeleteGoal(goal)}
                className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                title="Delete goal"
                aria-label="Delete goal"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ═══ Deadline & Schedule Information ═══ */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted mb-4 pb-3 border-b border-border/60">
        {/* Deadline indicator / inline editor */}
        {editingDeadline ? (
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-background-card-hover border border-border">
            <Calendar size={13} className="text-text-muted" />
            <input
              type="date"
              value={newDeadlineVal}
              onChange={(e) => setNewDeadlineVal(e.target.value)}
              className="input-glass px-2 py-0.5 text-xs text-text-primary"
            />
            <Button
              size="sm"
              variant="primary"
              onClick={handleSaveDeadline}
              disabled={savingDeadline}
              className="py-0.5 px-2 text-[10px]"
            >
              {savingDeadline ? <Loader2 size={10} className="animate-spin" /> : 'Save'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setNewDeadlineVal(goal.deadline ?? '');
                setEditingDeadline(false);
              }}
              className="py-0.5 px-1.5 text-[10px]"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Calendar
              size={13}
              className={effective.isDelayed ? 'text-amber-400' : 'text-text-muted'}
            />
            {goal.deadline ? (
              <span
                className={
                  effective.isDelayed ? 'text-amber-400 font-semibold' : 'text-text-secondary'
                }
              >
                Due {format(parseISO(goal.deadline), 'MMM d, yyyy')}
              </span>
            ) : (
              <span>No deadline set</span>
            )}

            {!isCompleted && (
              <button
                type="button"
                onClick={() => setEditingDeadline(true)}
                className="text-[10px] text-primary hover:underline ml-1"
                title="Edit deadline"
              >
                Change
              </button>
            )}
          </div>
        )}

        {/* Start Date */}
        <div className="flex items-center gap-1.5">
          <Clock size={13} />
          <span>Started {format(parseISO(goal.start_date), 'MMM d, yyyy')}</span>
        </div>

        {/* Reward Potential summary */}
        <div className="flex items-center gap-1 ml-auto text-[11px] font-semibold">
          <Sparkles size={12} className="text-primary" />
          <span className="text-text-secondary">Base: +{goal.base_xp} XP</span>
          {goal.bonus_xp > 0 && (
            <span
              className={
                bonusValid
                  ? 'text-emerald-400'
                  : 'line-through text-text-muted opacity-70'
              }
              title={
                bonusValid
                  ? 'Eligible for early/on-time completion bonus'
                  : 'Bonus forfeited because deadline passed in strict mode'
              }
            >
              (+{goal.bonus_xp} bonus)
            </span>
          )}
        </div>
      </div>

      {/* ═══ Progress Bar Section ═══ */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-bold text-text-primary" style={{ fontFamily: 'Space Grotesk' }}>
            {progressPercentage}% Progress
          </span>
          <span className="text-text-muted text-[11px]">
            {goal.progress_method === 'milestone'
              ? `${milestoneProgress.completed} of ${milestoneProgress.total} milestones completed`
              : `${goal.manual_progress_pct}% reached`}
          </span>
        </div>

        {/* Progress Bar Track */}
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: 8, background: 'rgba(255,255,255,0.06)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progressPercentage}%`,
              background: isCompleted
                ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                : effective.isDelayed
                ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                : 'linear-gradient(90deg, #a855f7, #ec4899)',
              boxShadow: isCompleted
                ? '0 0 10px rgba(16,185,129,0.4)'
                : effective.isDelayed
                ? '0 0 10px rgba(245,158,11,0.3)'
                : '0 0 10px rgba(168,85,247,0.3)',
            }}
          />
        </div>

        {/* Manual Progress Slider / Presets */}
        {goal.progress_method === 'manual' && !isCompleted && (
          <div className="mt-3 p-3 rounded-xl bg-background-card-hover/40 border border-border flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold text-text-secondary">
                Adjust Progress:
              </span>
              <div className="flex items-center gap-1.5">
                {[0, 25, 50, 75, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleManualProgressChange(preset)}
                    disabled={savingManualProgress}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${
                      goal.manual_progress_pct === preset
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-background-card hover:bg-background-card-hover text-text-muted hover:text-text-primary border border-border'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                value={manualSliderVal}
                onChange={(e) => setManualSliderVal(parseInt(e.target.value, 10))}
                onMouseUp={() => handleManualProgressChange(manualSliderVal)}
                onTouchEnd={() => handleManualProgressChange(manualSliderVal)}
                className="w-full accent-purple-500 cursor-pointer"
                disabled={savingManualProgress}
              />
              <span className="text-xs font-bold text-text-primary w-10 text-right">
                {manualSliderVal}%
              </span>
              {savingManualProgress && (
                <Loader2 size={13} className="animate-spin text-primary flex-shrink-0" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Delayed Notice Banner ═══ */}
      {effective.isDelayed && !isCompleted && (
        <div className="mb-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs">
          <AlertTriangle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-300">Goal is Delayed</p>
            <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
              The deadline passed {effective.daysOverdue} {effective.daysOverdue === 1 ? 'day' : 'days'} ago.
              {goal.is_strict
                ? ' Early completion bonus (+25 XP) is expired, but you will still earn full base XP (+50 XP) upon completion.'
                : ' You can edit the deadline to keep your roadmap up to date.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditingDeadline(true)}
            className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline whitespace-nowrap"
          >
            Reschedule
          </button>
        </div>
      )}

      {/* ═══ Milestones Section (for milestone-based goals) ═══ */}
      {goal.progress_method === 'milestone' && (
        <div className="mt-3">
          {/* Header toggle */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-xs font-bold text-text-primary hover:text-primary transition-colors"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span>Milestones ({goalMilestones.length})</span>
            </button>

            {!isCompleted && (
              <Button
                variant="ghost"
                size="sm"
                icon={Plus}
                onClick={() => onAddMilestone(goal.id)}
                className="py-1 px-2.5 text-[11px] font-semibold"
              >
                Add Milestone
              </Button>
            )}
          </div>

          {/* Collapsible list */}
          {expanded && (
            <div className="space-y-2 mt-2">
              {goalMilestones.length > 0 ? (
                goalMilestones.map((milestone) => (
                  <GoalMilestoneItem
                    key={milestone.id}
                    milestone={milestone}
                    linkedTask={milestone.linked_task_id ? taskMap.get(milestone.linked_task_id) : undefined}
                    isGoalCompleted={isCompleted}
                    onToggle={onToggleMilestone}
                    onEdit={onEditMilestone}
                    onDelete={onDeleteMilestone}
                  />
                ))
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-text-muted">
                  No milestones added yet.
                  {!isCompleted && (
                    <button
                      type="button"
                      onClick={() => onAddMilestone(goal.id)}
                      className="text-primary hover:underline font-semibold ml-1.5"
                    >
                      + Add the first milestone
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ Footer: Complete Goal CTA / Celebration ═══ */}
      <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between flex-wrap gap-2">
        {isCompleted ? (
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <Trophy size={16} />
            <span>
              Goal Completed
              {goal.completed_at ? ` on ${format(parseISO(goal.completed_at), 'MMM d, yyyy')}` : ''}!
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant={isEligibleForCompletion ? 'neon' : 'secondary'}
              size="sm"
              icon={Trophy}
              onClick={() => onCompleteGoal(goal)}
              disabled={!isEligibleForCompletion}
              className="py-1.5 px-3.5 text-xs font-bold"
              title={
                isEligibleForCompletion
                  ? 'Complete goal and claim authoritative XP'
                  : goal.progress_method === 'milestone'
                  ? 'Complete all milestones to finish this goal'
                  : 'Reach 100% manual progress to finish this goal'
              }
            >
              Complete Goal
            </Button>

            {!isEligibleForCompletion && (
              <span className="text-[11px] text-text-muted">
                {goal.progress_method === 'milestone'
                  ? `${milestoneProgress.total - milestoneProgress.completed} remaining to complete`
                  : 'Reach 100% to complete'}
              </span>
            )}
          </div>
        )}

        <div className="text-[11px] text-text-muted ml-auto">
          Created {format(parseISO(goal.created_at), 'MMM d')}
        </div>
      </div>
    </div>
  );
}
