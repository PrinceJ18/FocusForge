import { isToday, isThisWeek, isThisMonth, parseISO } from 'date-fns';

/**
 * Safely parse date and check if it is today.
 */
export function isDateToday(dateStr: string): boolean {
  try {
    return isToday(parseISO(dateStr));
  } catch {
    return false;
  }
}

/**
 * Safely parse date and check if it is in the current week.
 */
export function isDateThisWeek(dateStr: string): boolean {
  try {
    return isThisWeek(parseISO(dateStr));
  } catch {
    return false;
  }
}

/**
 * Safely parse date and check if it is in the current month.
 */
export function isDateThisMonth(dateStr: string): boolean {
  try {
    return isThisMonth(parseISO(dateStr));
  } catch {
    return false;
  }
}
