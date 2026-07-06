import type { Task } from '../../store/useStore';
import { useStore } from '../../store/useStore';
import { isDateToday, isDateThisWeek, isDateThisMonth } from './date';

export function calculateTodayTasks(tasks: Task[]): number {
  const nonRecurring = tasks.filter(
    (t) => (!t.recurrence_type || t.recurrence_type === 'none') && t.completed && t.completed_at && isDateToday(t.completed_at)
  ).length;
  
  const comps = useStore.getState().taskCompletions || [];
  const todayStr = new Date().toISOString().split('T')[0]; // simple YYYY-MM-DD
  const recurring = comps.filter((c) => c.occurrence_date === todayStr).length;

  return nonRecurring + recurring;
}

export function calculateWeeklyTasks(tasks: Task[]): number {
  const nonRecurring = tasks.filter(
    (t) => (!t.recurrence_type || t.recurrence_type === 'none') && t.completed && t.completed_at && isDateThisWeek(t.completed_at)
  ).length;

  const comps = useStore.getState().taskCompletions || [];
  const recurring = comps.filter((c) => isDateThisWeek(c.occurrence_date)).length;

  return nonRecurring + recurring;
}

export function calculateMonthlyTasks(tasks: Task[]): number {
  const nonRecurring = tasks.filter(
    (t) => (!t.recurrence_type || t.recurrence_type === 'none') && t.completed && t.completed_at && isDateThisMonth(t.completed_at)
  ).length;

  const comps = useStore.getState().taskCompletions || [];
  const recurring = comps.filter((c) => isDateThisMonth(c.occurrence_date)).length;

  return nonRecurring + recurring;
}

export function calculatePendingTasks(tasks: Task[]): number {
  return tasks.filter((t) => !t.completed).length;
}

export function calculateCompletedTasks(tasks: Task[]): number {
  const nonRecurring = tasks.filter((t) => (!t.recurrence_type || t.recurrence_type === 'none') && t.completed).length;
  const comps = useStore.getState().taskCompletions || [];
  return nonRecurring + comps.length;
}
