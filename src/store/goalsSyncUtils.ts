import { useStore } from './useStore';
import { completeMilestone, uncompleteMilestone } from './goalsStoreUtils';
import { getErrorMessage } from '../lib/getErrorMessage';

/**
 * Goals & Milestones Bidirectional Task Synchronization Engine
 *
 * Connects task lifecycle actions on the Tasks Board / Dashboard directly
 * to milestone progression, while remaining resilient against unapplied database
 * migrations or guest fallback states.
 */

/**
 * Triggered whenever a task is marked complete (completeTask).
 * Automatically marks any linked uncompleted milestone as completed,
 * claiming server-authoritative milestone XP via complete_milestone RPC.
 */
export async function syncTaskCompletionToMilestones(taskId: string): Promise<void> {
  const store = useStore.getState();
  if (!store.goalMilestones || store.goalMilestones.length === 0) return;

  const linkedMilestone = store.goalMilestones.find(
    (m) => m.linked_task_id === taskId && !m.completed
  );

  if (!linkedMilestone) return;

  try {
    if (store.user) {
      await completeMilestone(linkedMilestone.id);
    } else {
      // Local / guest mode fallback
      const now = new Date().toISOString();
      store.updateMilestoneLocal(linkedMilestone.id, {
        completed: true,
        completed_at: now,
        updated_at: now,
      });
      store.showNotification({
        type: 'xp',
        title: `+${linkedMilestone.xp_reward || 10} XP Earned`,
        message: `Linked milestone completed: ${linkedMilestone.title}`,
        xp: linkedMilestone.xp_reward || 10,
      });
    }
  } catch (err) {
    console.warn('[goalsSync] Failed to sync milestone completion:', getErrorMessage(err));
  }
}

/**
 * Triggered whenever a task is reopened (uncompleteTask).
 * Reopens any linked completed milestone while preserving earned XP (non-deductible).
 */
export async function syncTaskUncompletionToMilestones(taskId: string): Promise<void> {
  const store = useStore.getState();
  if (!store.goalMilestones || store.goalMilestones.length === 0) return;

  const linkedMilestone = store.goalMilestones.find(
    (m) => m.linked_task_id === taskId && m.completed
  );

  if (!linkedMilestone) return;

  try {
    if (store.user) {
      await uncompleteMilestone(linkedMilestone.id);
    } else {
      // Local / guest mode fallback
      const now = new Date().toISOString();
      store.updateMilestoneLocal(linkedMilestone.id, {
        completed: false,
        completed_at: null,
        updated_at: now,
      });
    }
  } catch (err) {
    console.warn('[goalsSync] Failed to sync milestone uncompletion:', getErrorMessage(err));
  }
}

/**
 * Triggered whenever a task is deleted (deleteTask).
 * Clears linked_task_id in memory to prevent orphan references,
 * matching database foreign key ON DELETE SET NULL behavior.
 */
export function syncTaskDeletionToMilestones(taskId: string): void {
  const store = useStore.getState();
  if (!store.goalMilestones || store.goalMilestones.length === 0) return;

  const linkedMilestones = store.goalMilestones.filter((m) => m.linked_task_id === taskId);

  linkedMilestones.forEach((m) => {
    store.updateMilestoneLocal(m.id, { linked_task_id: null });
  });
}
