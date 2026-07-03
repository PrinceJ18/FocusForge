import { getLevelInfo } from '../levels';
import { getEarnedBadgeIds } from '../statsUtils';
import type { FocusSession, Task, SavingsGoal, Expense, Profile } from '../../store/useStore';

export function calculateCurrentLevel(xp: number) {
  return getLevelInfo(xp);
}

export function calculateXPProgress(xp: number): number {
  return xp % 100;
}

export function calculateBadgeCount(earnedBadgeIds: Set<string>): number {
  return earnedBadgeIds.size;
}

export interface Achievement {
  id: number;
  title: string;
  description: string;
  unlocked: boolean;
}

export function calculateAchievements(
  focusSessions: FocusSession[],
  tasks: Task[],
  savingsGoals: SavingsGoal[],
  expenses: Expense[],
  profile: Profile
): Achievement[] {
  const earnedBadges = getEarnedBadgeIds({ profile, focusSessions, tasks, savingsGoals });

  return [
    {
      id: 1,
      title: 'First Focus',
      description: 'Complete your first focus session',
      unlocked: earnedBadges.has('first_focus'),
    },
    {
      id: 2,
      title: 'Deep Worker',
      description: 'Complete 10 focus sessions',
      unlocked: earnedBadges.has('focus_10'),
    },
    {
      id: 3,
      title: 'Money Master',
      description: 'Track expenses for 7 days',
      unlocked: expenses.length >= 7,
    },
  ];
}
