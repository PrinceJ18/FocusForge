import { useEffect } from 'react';
import { parseISO, differenceInCalendarDays } from 'date-fns';
import { useStore } from '../store/useStore';
import { formatLocalDate } from '../lib/dateUtils';
import { getEffectiveGoalStatus } from '../components/goals/goalsUiUtils';

/**
 * useGoalDeadlineWatcher
 *
 * Proactive deadline urgency and rollover watcher for Goals & Milestones.
 *
 * Monitors:
 * 1. Strict goals due today (diffDays === 0)
 * 2. Strict goals due tomorrow (diffDays === 1)
 * 3. Overdue / delayed goals (diffDays < 0 or getEffectiveGoalStatus returning isDelayed)
 *
 * Notification Throttling:
 * Notifications are dispatched at most once per goal per notification category
 * per calendar day to avoid notification spam across renders or route navigations.
 */
// Module-level deduplication set to avoid duplicate notifications across re-renders/mounts
const notifiedKeys = new Set<string>();

export function useGoalDeadlineWatcher(): void {
  const goals = useStore((s) => s.goals);
  const showNotification = useStore((s) => s.showNotification);

  useEffect(() => {
    if (!goals || goals.length === 0) return;

    const checkDeadlines = () => {
      const todayStr = formatLocalDate(new Date());
      const todayDate = parseISO(todayStr);

      goals.forEach((goal) => {
        // Only monitor active (in-progress) goals with a deadline
        if (goal.status !== 'in_progress' || !goal.deadline) return;

        const effective = getEffectiveGoalStatus(goal);
        const deadlineDate = parseISO(goal.deadline);
        const diffDays = differenceInCalendarDays(deadlineDate, todayDate);

        // 1. Strict Goal Due Today
        if (goal.is_strict && diffDays === 0) {
          const key = `${todayStr}:${goal.id}:due_today`;
          if (!notifiedKeys.has(key)) {
            notifiedKeys.add(key);
            showNotification({
              type: 'goal',
              title: 'Goal Due Today',
              message: `"${goal.title}" is due today! Complete your milestones to claim full bonus XP.`,
            });
          }
          return;
        }

        // 2. Strict Goal Due Tomorrow
        if (goal.is_strict && diffDays === 1) {
          const key = `${todayStr}:${goal.id}:due_tomorrow`;
          if (!notifiedKeys.has(key)) {
            notifiedKeys.add(key);
            showNotification({
              type: 'goal',
              title: 'Goal Due Tomorrow',
              message: `"${goal.title}" is due tomorrow! Keep up the momentum.`,
            });
          }
          return;
        }

        // 3. Goal Overdue / Delayed
        if (effective.isDelayed) {
          const key = `${todayStr}:${goal.id}:delayed`;
          if (!notifiedKeys.has(key)) {
            notifiedKeys.add(key);
            const overdueMsg =
              effective.daysOverdue > 1
                ? `"${goal.title}" is ${effective.daysOverdue} days past its target deadline.`
                : `"${goal.title}" is past its target deadline.`;

            showNotification({
              type: 'goal',
              title: goal.is_strict ? 'Strict Goal Overdue' : 'Goal Delayed',
              message: overdueMsg,
            });
          }
        }
      });
    };

    // Run check immediately on mount or goals update
    checkDeadlines();

    // Check periodically every 5 minutes to handle midnight date rollovers
    const intervalId = setInterval(checkDeadlines, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [goals, showNotification]);
}
