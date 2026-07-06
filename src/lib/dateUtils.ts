import { format } from 'date-fns';

/**
 * Formats a Date object as a local calendar date string (YYYY-MM-DD)
 * using the local timezone to ensure session date attribution is correct.
 */
export function formatLocalDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
