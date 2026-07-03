import type { Task } from '../../store/useStore';
import { isDateToday, isDateThisWeek, isDateThisMonth } from './date';

export function calculateTodayTasks(tasks: Task[]): number {
  return tasks.filter(
    (t) => t.completed && t.completed_at && isDateToday(t.completed_at)
  ).length;
}

export function calculateWeeklyTasks(tasks: Task[]): number {
  return tasks.filter(
    (t) => t.completed && t.completed_at && isDateThisWeek(t.completed_at)
  ).length;
}

export function calculateMonthlyTasks(tasks: Task[]): number {
  return tasks.filter(
    (t) => t.completed && t.completed_at && isDateThisMonth(t.completed_at)
  ).length;
}

export function calculatePendingTasks(tasks: Task[]): number {
  return tasks.filter((t) => !t.completed).length;
}

export function calculateCompletedTasks(tasks: Task[]): number {
  return tasks.filter((t) => t.completed).length;
}
