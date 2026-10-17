import { parseISO, differenceInCalendarDays, endOfWeek, endOfMonth } from 'date-fns';
import { formatLocalDate } from '../../lib/dateUtils';
import type { Goal, GoalMilestone, GoalPeriod, GoalStatus } from '../../types/goals';
import type { Task } from '../../store/slices/types';

/**
 * Calculates milestone completion counts and percentage for a goal.
 */
export function calculateGoalMilestoneProgress(
  goalId: string,
  milestones: GoalMilestone[]
): { completed: number; total: number; percentage: number } {
  const goalMilestones = milestones.filter((m) => m.goal_id === goalId);
  const total = goalMilestones.length;
  if (total === 0) {
    return { completed: 0, total: 0, percentage: 0 };
  }
  const completed = goalMilestones.filter((m) => m.completed).length;
  const percentage = Math.round((completed / total) * 100);
  return { completed, total, percentage };
}

/**
 * Computes effective goal status, taking client-side deadline into account.
 * (Client cannot update SQL status column directly due to column-level grants).
 */
export function getEffectiveGoalStatus(goal: Goal): {
  status: GoalStatus;
  isDelayed: boolean;
  daysOverdue: number;
} {
  if (goal.status === 'completed' || goal.status === 'abandoned') {
    return { status: goal.status, isDelayed: false, daysOverdue: 0 };
  }

  if (goal.deadline) {
    const todayStr = formatLocalDate(new Date());
    if (todayStr > goal.deadline) {
      const todayDate = parseISO(todayStr);
      const deadlineDate = parseISO(goal.deadline);
      const daysOverdue = Math.max(1, differenceInCalendarDays(todayDate, deadlineDate));
      return { status: 'delayed', isDelayed: true, daysOverdue };
    }
  }

  return { status: goal.status, isDelayed: false, daysOverdue: 0 };
}

/**
 * Evaluates whether a goal qualifies for the early/on-time completion bonus (+25 XP).
 * In strict mode: bonus requires CURRENT_DATE <= deadline.
 * In non-strict mode: bonus is always eligible if base criteria met.
 */
export function isBonusEligible(goal: Goal): boolean {
  if (!goal.is_strict || !goal.deadline) {
    return true;
  }
  const todayStr = formatLocalDate(new Date());
  return todayStr <= goal.deadline;
}

/**
 * Suggests an initial deadline based on chosen goal period.
 */
export function suggestDeadline(period: GoalPeriod): string | null {
  const now = new Date();
  switch (period) {
    case 'daily':
      return formatLocalDate(now);
    case 'weekly':
      return formatLocalDate(endOfWeek(now, { weekStartsOn: 1 }));
    case 'monthly':
      return formatLocalDate(endOfMonth(now));
    case 'custom':
    case 'long_term':
    default:
      return null;
  }
}

/**
 * Human-readable label for a goal period.
 */
export function formatGoalPeriod(period: GoalPeriod): string {
  switch (period) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    case 'custom':
      return 'Custom';
    case 'long_term':
      return 'Long-Term';
    default:
      return period;
  }
}

/**
 * Filters tasks available for linking to a milestone.
 * Rule: A task may be linked to at most one ACTIVE (completed = false) milestone.
 * Completed milestones release their task link for reuse.
 */
export function getEligibleTasksForMilestone(
  tasks: Task[],
  milestones: GoalMilestone[],
  currentMilestoneId?: string
): Task[] {
  // Set of task IDs linked to any active uncompleted milestone (excluding the one being edited)
  const activeLinkedTaskIds = new Set(
    milestones
      .filter((m) => !m.completed && m.linked_task_id && m.id !== currentMilestoneId)
      .map((m) => m.linked_task_id as string)
  );

  return tasks.filter((task) => !activeLinkedTaskIds.has(task.id));
}
