import type { Task } from '../../store/useStore';
import { useStore } from '../../store/useStore';
import { isDateToday, isDateThisWeek, isDateThisMonth } from './date';

export function calculateTodayTasks(tasks: Task[]): number {
  const nonRecurring = tasks.filter(
    (t) => (!t.recurrence_type || t.recurrence_type === 'none') && t.status === 'completed' && t.completed_at && isDateToday(t.completed_at)
  ).length;
  
  const comps = useStore.getState().taskCompletions || [];
  const todayStr = new Date().toISOString().split('T')[0]; // simple YYYY-MM-DD
  const recurring = comps.filter((c) => c.occurrence_date === todayStr && c.status === 'completed').length;

  return nonRecurring + recurring;
}

export function calculateWeeklyTasks(tasks: Task[]): number {
  const nonRecurring = tasks.filter(
    (t) => (!t.recurrence_type || t.recurrence_type === 'none') && t.status === 'completed' && t.completed_at && isDateThisWeek(t.completed_at)
  ).length;

  const comps = useStore.getState().taskCompletions || [];
  const recurring = comps.filter((c) => c.status === 'completed' && isDateThisWeek(c.occurrence_date)).length;

  return nonRecurring + recurring;
}

export function calculateMonthlyTasks(tasks: Task[]): number {
  const nonRecurring = tasks.filter(
    (t) => (!t.recurrence_type || t.recurrence_type === 'none') && t.status === 'completed' && t.completed_at && isDateThisMonth(t.completed_at)
  ).length;

  const comps = useStore.getState().taskCompletions || [];
  const recurring = comps.filter((c) => c.status === 'completed' && isDateThisMonth(c.occurrence_date)).length;

  return nonRecurring + recurring;
}

export function calculatePendingTasks(tasks: Task[]): number {
  return tasks.filter((t) => t.status === 'pending').length;
}

export function calculateCompletedTasks(tasks: Task[]): number {
  const nonRecurring = tasks.filter((t) => (!t.recurrence_type || t.recurrence_type === 'none') && t.status === 'completed').length;
  const comps = useStore.getState().taskCompletions || [];
  return nonRecurring + comps.filter(c => c.status === 'completed').length;
}
