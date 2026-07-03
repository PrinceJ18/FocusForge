import type { FocusSession } from '../../store/useStore';
import { isDateToday, isDateThisWeek, isDateThisMonth } from './date';

export function calculateTodayFocus(focusSessions: FocusSession[]): number {
  return focusSessions
    .filter((s) => isDateToday(s.session_date))
    .reduce((sum, s) => sum + s.minutes, 0);
}

export function calculateWeeklyFocus(focusSessions: FocusSession[]): number {
  return focusSessions
    .filter((s) => isDateThisWeek(s.session_date))
    .reduce((sum, s) => sum + s.minutes, 0);
}

export function calculateMonthlyFocus(focusSessions: FocusSession[]): number {
  return focusSessions
    .filter((s) => isDateThisMonth(s.session_date))
    .reduce((sum, s) => sum + s.minutes, 0);
}

export function calculateTodaySessions(focusSessions: FocusSession[]): number {
  return focusSessions
    .filter((s) => isDateToday(s.session_date))
    .reduce((sum, s) => sum + s.sessions_count, 0);
}

export function calculateWeeklySessions(focusSessions: FocusSession[]): number {
  return focusSessions
    .filter((s) => isDateThisWeek(s.session_date))
    .reduce((sum, s) => sum + s.sessions_count, 0);
}

export function calculateMonthlySessions(focusSessions: FocusSession[]): number {
  return focusSessions
    .filter((s) => isDateThisMonth(s.session_date))
    .reduce((sum, s) => sum + s.sessions_count, 0);
}

export function calculateAllTimeFocusMinutes(focusSessions: FocusSession[]): number {
  return focusSessions.reduce((sum, s) => sum + s.minutes, 0);
}

export function calculateAllTimeFocusSessions(focusSessions: FocusSession[]): number {
  return focusSessions.reduce((sum, s) => sum + s.sessions_count, 0);
}
