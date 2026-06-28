import { isToday, isThisMonth, parseISO } from 'date-fns';
import type { FocusSession, Task } from '../store/useStore';

// ============================================================
// Focus Statistics — Single Source of Truth
// ============================================================

/** Today's total focus minutes */
export function getTodayFocusMinutes(focusSessions: FocusSession[]): number {
  return focusSessions
    .filter((s) => isToday(parseISO(s.session_date)))
    .reduce((sum, s) => sum + s.minutes, 0);
}

/** Today's total focus session count */
export function getTodayFocusSessions(focusSessions: FocusSession[]): number {
  return focusSessions
    .filter((s) => isToday(parseISO(s.session_date)))
    .reduce((sum, s) => sum + s.sessions_count, 0);
}

/** This month's total focus minutes */
export function getMonthlyFocusMinutes(focusSessions: FocusSession[]): number {
  return focusSessions
    .filter((s) => isThisMonth(parseISO(s.session_date)))
    .reduce((sum, s) => sum + s.minutes, 0);
}

/** This month's total focus session count */
export function getMonthlyFocusSessions(focusSessions: FocusSession[]): number {
  return focusSessions
    .filter((s) => isThisMonth(parseISO(s.session_date)))
    .reduce((sum, s) => sum + s.sessions_count, 0);
}

/** All-time total focus session count */
export function getAllTimeFocusSessions(focusSessions: FocusSession[]): number {
  return focusSessions.reduce((sum, s) => sum + s.sessions_count, 0);
}

/** All-time total focus minutes */
export function getAllTimeFocusMinutes(focusSessions: FocusSession[]): number {
  return focusSessions.reduce((sum, s) => sum + s.minutes, 0);
}

// ============================================================
// Task Statistics — Single Source of Truth
// ============================================================

/** Tasks completed today */
export function getTodayCompletedTasks(tasks: Task[]): number {
  return tasks.filter(
    (t) => t.completed && t.completed_at && isToday(parseISO(t.completed_at))
  ).length;
}

/** Tasks completed this month */
export function getMonthlyCompletedTasks(tasks: Task[]): number {
  return tasks.filter(
    (t) => t.completed && t.completed_at && isThisMonth(parseISO(t.completed_at))
  ).length;
}

/** All pending (incomplete) tasks */
export function getPendingTasksCount(tasks: Task[]): number {
  return tasks.filter((t) => !t.completed).length;
}

/** All completed tasks (all time) */
export function getCompletedTasksCount(tasks: Task[]): number {
  return tasks.filter((t) => t.completed).length;
}
