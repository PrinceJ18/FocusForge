import React, { useState, useMemo } from 'react';
import {
  Target,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import GoalCardItem from './GoalCardItem';
import GoalFormModal from './GoalFormModal';
import MilestoneFormModal from './MilestoneFormModal';
import GoalCompleteConfirmModal from './GoalCompleteConfirmModal';
import {
  getEffectiveGoalStatus,
  getEligibleTasksForMilestone,
} from './goalsUiUtils';
import { useStore } from '../../store/useStore';
import {
  createGoal,
  updateGoal,
  deleteGoal,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  completeMilestone,
  uncompleteMilestone,
  completeGoal,
} from '../../store/goalsStoreUtils';
import { getErrorMessage } from '../../lib/getErrorMessage';
import type {
  Goal,
  GoalMilestone,
  GoalPeriod,
  CreateGoalInput,
  UpdateGoalInput,
  CreateMilestoneInput,
  UpdateMilestoneInput,
} from '../../types/goals';

const PERIOD_FILTERS: Array<{ id: 'all' | GoalPeriod; label: string }> = [
  { id: 'all', label: 'All Horizons' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'custom', label: 'Custom' },
  { id: 'long_term', label: 'Long-Term' },
];

export default function GoalsMilestonesCard() {
  const { goals, goalMilestones, tasks, user, showNotification } = useStore();

  // Filter States
  const [periodFilter, setPeriodFilter] = useState<'all' | GoalPeriod>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'completed'>('active');

  // Modal States
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [addingMilestoneGoalId, setAddingMilestoneGoalId] = useState<string | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<GoalMilestone | null>(null);
  const [completingGoal, setCompletingGoal] = useState<Goal | null>(null);

  // ═══ KPI Metrics ═══
  const metrics = useMemo(() => {
    let activeCount = 0;
    let completedCount = 0;
    let delayedCount = 0;

    goals.forEach((g) => {
      if (g.status === 'completed') {
        completedCount++;
      } else {
        activeCount++;
        const eff = getEffectiveGoalStatus(g);
        if (eff.isDelayed) delayedCount++;
      }
    });

    const totalMilestones = goalMilestones.length;
    const completedMilestones = goalMilestones.filter((m) => m.completed).length;

    return {
      totalGoals: goals.length,
      activeCount,
      completedCount,
      delayedCount,
      totalMilestones,
      completedMilestones,
    };
  }, [goals, goalMilestones]);

  // ═══ Filtered Goals ═══
  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      // Period match
      if (periodFilter !== 'all' && g.period !== periodFilter) {
        return false;
      }

      // Status match
      if (statusFilter === 'completed') {
        return g.status === 'completed';
      } else {
        // 'active' includes in_progress and delayed
        return g.status !== 'completed' && g.status !== 'abandoned';
      }
    });
  }, [goals, periodFilter, statusFilter]);

  // ═══ Operations with Error Handling ═══

  const handleCreateGoal = async (data: CreateGoalInput | UpdateGoalInput) => {
    if (!user) {
      showNotification({
        type: 'error',
        title: 'Authentication Required',
        message: 'You must be signed in to create and save goals.',
      });
      return;
    }
    try {
      await createGoal(data as CreateGoalInput, user.id);
      showNotification({
        type: 'success',
        title: 'Goal Created',
        message: `Successfully created "${data.title}".`,
      });
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Could Not Create Goal',
        message: getErrorMessage(err),
      });
      throw err;
    }
  };

  const handleUpdateGoal = async (data: CreateGoalInput | UpdateGoalInput) => {
    if (!editingGoal) return;
    try {
      await updateGoal(editingGoal.id, data as UpdateGoalInput);
      showNotification({
        type: 'success',
        title: 'Goal Updated',
        message: 'Goal details updated successfully.',
      });
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Update Failed',
        message: getErrorMessage(err),
      });
      throw err;
    }
  };

  const handleDeleteGoal = async (goal: Goal) => {
    const confirmed = window.confirm(
      `Delete goal "${goal.title}"? Associated milestones will also be removed.`
    );
    if (!confirmed) return;

    try {
      await deleteGoal(goal.id);
      showNotification({
        type: 'info',
        title: 'Goal Deleted',
        message: `Removed "${goal.title}".`,
      });
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Delete Failed',
        message: getErrorMessage(err),
      });
    }
  };

  const handleCreateMilestone = async (data: CreateMilestoneInput | UpdateMilestoneInput) => {
    if (!user) return;
    try {
      await createMilestone(data as CreateMilestoneInput, user.id);
      showNotification({
        type: 'success',
        title: 'Milestone Added',
        message: `Added "${data.title}" (+10 XP potential).`,
      });
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Could Not Add Milestone',
        message: getErrorMessage(err),
      });
      throw err;
    }
  };

  const handleUpdateMilestone = async (data: CreateMilestoneInput | UpdateMilestoneInput) => {
    if (!editingMilestone) return;
    try {
      await updateMilestone(editingMilestone.id, data as UpdateMilestoneInput);
      showNotification({
        type: 'success',
        title: 'Milestone Updated',
        message: 'Milestone details updated.',
      });
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Update Failed',
        message: getErrorMessage(err),
      });
      throw err;
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    try {
      await deleteMilestone(milestoneId);
      showNotification({
        type: 'info',
        title: 'Milestone Removed',
        message: 'Milestone deleted successfully.',
      });
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Delete Failed',
        message: getErrorMessage(err),
      });
    }
  };

  const handleToggleMilestone = async (milestoneId: string, currentCompleted: boolean) => {
    try {
      if (currentCompleted) {
        await uncompleteMilestone(milestoneId);
        showNotification({
          type: 'info',
          title: 'Milestone Reopened',
          message: 'Milestone marked incomplete. Previously earned XP is preserved.',
        });
      } else {
        await completeMilestone(milestoneId);
      }
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Action Failed',
        message: getErrorMessage(err),
      });
    }
  };

  const handleUpdateManualProgress = async (goalId: string, pct: number) => {
    try {
      await updateGoal(goalId, { manual_progress_pct: pct });
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Progress Update Failed',
        message: getErrorMessage(err),
      });
    }
  };

  const handleUpdateDeadline = async (goalId: string, deadline: string | null) => {
    try {
      await updateGoal(goalId, { deadline });
      showNotification({
        type: 'success',
        title: 'Deadline Updated',
        message: deadline ? `Target deadline adjusted to ${deadline}.` : 'Deadline cleared.',
      });
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Deadline Update Failed',
        message: getErrorMessage(err),
      });
    }
  };

  const handleConfirmCompleteGoal = async (goalId: string) => {
    try {
      await completeGoal(goalId);
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Completion Failed',
        message: getErrorMessage(err),
      });
    }
  };

  // Eligible tasks for the milestone modal (enforcing task-linking 1-to-1 uniqueness)
  const availableTasksForMilestone = useMemo(() => {
    return getEligibleTasksForMilestone(tasks, goalMilestones, editingMilestone?.id);
  }, [tasks, goalMilestones, editingMilestone]);

  return (
    <Card padding="md" className="lg:col-span-2 flex flex-col gap-5">
      {/* ═══ ROW 1: Header + Stat Pills + CTA ═══ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        {/* Title + Subtitle */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              boxShadow: '0 0 20px rgba(168,85,247,0.3)',
            }}
          >
            <Target size={20} className="text-white" />
          </div>
          <div>
            <h3
              className="text-base font-bold text-text-primary leading-tight flex items-center gap-2"
              style={{ fontFamily: 'Space Grotesk' }}
            >
              Goals & Milestones
              <span className="text-xs font-normal text-text-muted">
                ({metrics.activeCount} active • {metrics.completedCount} completed)
              </span>
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Set multi-horizon goals, track milestone progress, link tasks, and earn bonus XP.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <Button
            variant="neon"
            size="sm"
            icon={Plus}
            onClick={() => setShowCreateGoal(true)}
            className="py-2 px-4 text-xs font-bold rounded-xl"
          >
            New Goal
          </Button>
        </div>
      </div>

      {/* ═══ ROW 2: KPI Metrics Bar ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Active Goals */}
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
            <Target size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
              Active Goals
            </div>
            <div
              className="text-lg font-black text-text-primary leading-tight"
              style={{ fontFamily: 'Space Grotesk' }}
            >
              {metrics.activeCount}
            </div>
          </div>
        </div>

        {/* Completed Goals */}
        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
              Completed
            </div>
            <div
              className="text-lg font-black text-text-primary leading-tight"
              style={{ fontFamily: 'Space Grotesk' }}
            >
              {metrics.completedCount}
            </div>
          </div>
        </div>

        {/* Milestones Completed */}
        <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center flex-shrink-0">
            <Sparkles size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
              Milestones
            </div>
            <div
              className="text-lg font-black text-text-primary leading-tight"
              style={{ fontFamily: 'Space Grotesk' }}
            >
              {metrics.completedMilestones} / {metrics.totalMilestones}
            </div>
          </div>
        </div>

        {/* Delayed Goals */}
        <div
          className={`p-3 rounded-xl border flex items-center gap-3 ${
            metrics.delayedCount > 0
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
              : 'bg-background-card border-border text-text-muted'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              metrics.delayedCount > 0
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-background-card-hover text-text-muted'
            }`}
          >
            <AlertTriangle size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider font-semibold">
              Delayed
            </div>
            <div
              className="text-lg font-black text-text-primary leading-tight"
              style={{ fontFamily: 'Space Grotesk' }}
            >
              {metrics.delayedCount}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ ROW 3: Filter Toolbar ═══ */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Period Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 rounded-xl bg-background-card-hover/40 border border-border">
          {PERIOD_FILTERS.map((f) => {
            const active = periodFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setPeriodFilter(f.id)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                  active
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-muted hover:text-text-primary hover:bg-background-card'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Active vs Completed Toggle */}
        <div className="flex p-0.5 rounded-lg bg-background-card-hover border border-border">
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
              statusFilter === 'active'
                ? 'bg-primary/20 text-primary'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Active ({metrics.activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
              statusFilter === 'completed'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Completed ({metrics.completedCount})
          </button>
        </div>
      </div>

      {/* ═══ ROW 4: Goal Cards List / Empty State ═══ */}
      <div className="space-y-4">
        {goals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No Goals Created Yet"
            description="Set daily targets, weekly sprints, or multi-month milestones. Track your progress, link tasks, and earn bonus XP on completion."
            action={{
              label: 'Create First Goal',
              onClick: () => setShowCreateGoal(true),
              icon: Plus,
              variant: 'neon',
            }}
          />
        ) : filteredGoals.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-border text-center space-y-2">
            <p className="text-sm font-semibold text-text-primary">
              No {statusFilter === 'completed' ? 'completed' : 'active'} goals in this horizon
            </p>
            <p className="text-xs text-text-muted">
              Try selecting "All Horizons" or create a new goal in this category.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setPeriodFilter('all');
                setStatusFilter('active');
              }}
              className="mt-2"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          filteredGoals.map((goal) => (
            <GoalCardItem
              key={goal.id}
              goal={goal}
              milestones={goalMilestones}
              tasks={tasks}
              onEditGoal={(g) => setEditingGoal(g)}
              onDeleteGoal={handleDeleteGoal}
              onCompleteGoal={(g) => setCompletingGoal(g)}
              onAddMilestone={(goalId) => setAddingMilestoneGoalId(goalId)}
              onEditMilestone={(m) => setEditingMilestone(m)}
              onToggleMilestone={handleToggleMilestone}
              onDeleteMilestone={handleDeleteMilestone}
              onUpdateManualProgress={handleUpdateManualProgress}
              onUpdateDeadline={handleUpdateDeadline}
            />
          ))
        )}
      </div>

      {/* ═══ MODALS ═══ */}
      {/* Create Goal Modal */}
      {showCreateGoal && (
        <GoalFormModal
          isOpen={true}
          onClose={() => setShowCreateGoal(false)}
          onSave={handleCreateGoal}
        />
      )}

      {/* Edit Goal Modal */}
      {editingGoal && (
        <GoalFormModal
          isOpen={true}
          initialGoal={editingGoal}
          onClose={() => setEditingGoal(null)}
          onSave={handleUpdateGoal}
        />
      )}

      {/* Add Milestone Modal */}
      {addingMilestoneGoalId && (
        <MilestoneFormModal
          isOpen={true}
          goalId={addingMilestoneGoalId}
          availableTasks={availableTasksForMilestone}
          onClose={() => setAddingMilestoneGoalId(null)}
          onSave={handleCreateMilestone}
        />
      )}

      {/* Edit Milestone Modal */}
      {editingMilestone && (
        <MilestoneFormModal
          isOpen={true}
          goalId={editingMilestone.goal_id}
          initialMilestone={editingMilestone}
          availableTasks={availableTasksForMilestone}
          onClose={() => setEditingMilestone(null)}
          onSave={handleUpdateMilestone}
        />
      )}

      {/* Goal Complete Confirmation Modal */}
      {completingGoal && (
        <GoalCompleteConfirmModal
          isOpen={true}
          goal={completingGoal}
          onClose={() => setCompletingGoal(null)}
          onConfirm={handleConfirmCompleteGoal}
        />
      )}
    </Card>
  );
}
