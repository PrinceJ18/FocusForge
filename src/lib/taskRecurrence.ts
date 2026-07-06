import {
  parseISO,
  format,
  addDays,
  addWeeks,
  addMonths,
  isToday,
  isSameDay,
  isBefore,
  isAfter,
} from 'date-fns';
import type { Task, TaskCompletion } from '../store/useStore';

/**
 * Validate recurrence rule settings.
 * Returns an error message if invalid, or null if valid.
 */
export function validateRecurrenceRule(rule: Partial<Task>): string | null {
  const type = rule.recurrence_type;
  if (!type || type === 'none') {
    return null;
  }

  // Scheduled date is required for recurrence
  if (!rule.scheduled_date) {
    return 'Recurrence requires a scheduled start date.';
  }

  // Interval must be a positive integer
  const interval = rule.recurrence_interval;
  if (interval !== undefined && (interval === null || interval <= 0 || !Number.isInteger(interval))) {
    return 'Recurrence interval must be a positive integer.';
  }

  // Weekdays recurrence must specify days
  if (type === 'weekdays') {
    if (!rule.recurrence_weekdays || rule.recurrence_weekdays.length === 0) {
      return 'Weekday recurrence requires at least one weekday selected.';
    }
  }

  // End date cannot be before scheduled date
  if (rule.recurrence_end_date && rule.scheduled_date) {
    try {
      const start = parseISO(rule.scheduled_date);
      const end = parseISO(rule.recurrence_end_date);
      if (isBefore(end, start) && !isSameDay(end, start)) {
        return 'End date cannot be before the scheduled start date.';
      }
    } catch {
      return 'Invalid date format provided.';
    }
  }

  return null;
}

/**
 * Get all occurrence dates for a task within a range of dates.
 * Safe, bounded, and handles leap years / month boundaries.
 */
export function getTaskOccurrencesInRange(task: Task, startDate: Date, endDate: Date): Date[] {
  const occurrences: Date[] = [];
  if (!task.scheduled_date) return [];

  let start: Date;
  let startRange: Date;
  let endRange: Date;
  try {
    start = parseISO(task.scheduled_date);
    // Align dates to local midnight to avoid timezone shifts during comparisons
    startRange = new Date(startDate);
    startRange.setHours(0, 0, 0, 0);
    endRange = new Date(endDate);
    endRange.setHours(23, 59, 59, 999);
  } catch {
    return [];
  }

  const type = task.recurrence_type || 'none';
  if (type === 'none') {
    if (start >= startRange && start <= endRange) {
      occurrences.push(start);
    }
    return occurrences;
  }

  const interval = task.recurrence_interval && task.recurrence_interval > 0 ? task.recurrence_interval : 1;
  const endLimit = task.recurrence_end_date ? parseISO(task.recurrence_end_date) : null;
  if (endLimit) {
    endLimit.setHours(23, 59, 59, 999);
  }

  const actualStart = new Date(start);
  actualStart.setHours(0, 0, 0, 0);

  const rangeStart = startRange > actualStart ? startRange : actualStart;
  const rangeEnd = endLimit && endLimit < endRange ? endLimit : endRange;

  if (rangeStart > rangeEnd) return [];

  // Prevention mechanism for infinite loops
  let k = 0;
  const maxIterations = 500;

  switch (type) {
    case 'daily':
    case 'custom': { // custom is daily interval
      while (k < maxIterations) {
        const next = addDays(actualStart, k * interval);
        if (endLimit && next > endLimit) break;
        if (next > rangeEnd) break;
        if (next >= rangeStart && next <= rangeEnd) {
          occurrences.push(next);
        }
        k++;
      }
      break;
    }

    case 'weekly': {
      while (k < maxIterations) {
        const next = addWeeks(actualStart, k * interval);
        if (endLimit && next > endLimit) break;
        if (next > rangeEnd) break;
        if (next >= rangeStart && next <= rangeEnd) {
          occurrences.push(next);
        }
        k++;
      }
      break;
    }

    case 'monthly': {
      while (k < maxIterations) {
        const next = addMonths(actualStart, k * interval);
        if (endLimit && next > endLimit) break;
        if (next > rangeEnd) break;
        if (next >= rangeStart && next <= rangeEnd) {
          occurrences.push(next);
        }
        k++;
      }
      break;
    }

    case 'weekdays': {
      const weekdays = task.recurrence_weekdays || [];
      if (weekdays.length === 0) break;
      const WEEKDAYS_MAP = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      
      let next = new Date(actualStart);
      while (k < 1000) { // check day-by-day up to rangeEnd
        if (endLimit && next > endLimit) break;
        if (next > rangeEnd) break;
        
        const dayName = WEEKDAYS_MAP[next.getDay()];
        if (weekdays.includes(dayName)) {
          if (next >= rangeStart && next <= rangeEnd) {
            occurrences.push(new Date(next));
          }
        }
        next = addDays(next, 1);
        k++;
      }
      break;
    }
  }

  return occurrences;
}

/**
 * Get the next occurrence of a recurring task strictly after a specific date.
 */
export function getNextTaskOccurrence(task: Task, fromDate: Date): Date | null {
  if (!task.scheduled_date) return null;
  
  let start: Date;
  let referenceDate: Date;
  try {
    start = parseISO(task.scheduled_date);
    referenceDate = new Date(fromDate);
  } catch {
    return null;
  }

  if (task.recurrence_type === 'none') {
    return start > referenceDate ? start : null;
  }

  // Upper boundary to search (1 year ahead)
  const maxSearchLimit = addMonths(referenceDate, 12);
  const endLimit = task.recurrence_end_date ? parseISO(task.recurrence_end_date) : null;
  const searchEnd = endLimit && endLimit < maxSearchLimit ? endLimit : maxSearchLimit;

  const occurrences = getTaskOccurrencesInRange(task, start, searchEnd);
  const next = occurrences.find((d) => d > referenceDate);
  return next || null;
}

/**
 * Check if a task is scheduled on a specific calendar date.
 */
export function isTaskScheduledForDate(task: Task, date: Date): boolean {
  if (!task.scheduled_date) return false;
  
  // Align comparison date to local midnight
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);

  const occurrences = getTaskOccurrencesInRange(task, compareDate, compareDate);
  return occurrences.length > 0;
}

/**
 * Returns the effective date and time of the task reminder.
 * 
 * Rules:
 * - If reminder_enabled is false, returns null.
 * - If scheduled_date is missing, returns null.
 * - If reminder_time is provided (e.g. "14:30"), parses and combines it with scheduled_date.
 * - If reminder_time is null/empty, defaults to 9:00 AM on scheduled_date.
 */
export function getEffectiveReminderTime(task: Task): Date | null {
  if (!task.reminder_enabled || !task.scheduled_date) {
    return null;
  }

  try {
    const baseDate = parseISO(task.scheduled_date);
    const timeStr = task.reminder_time || '09:00';
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    const reminderDate = new Date(baseDate);
    reminderDate.setHours(hours || 9, minutes || 0, 0, 0);
    return reminderDate;
  } catch {
    return null;
  }
}

/**
 * Selector that queries all tasks scheduled for a given date, resolving their completion status.
 * Properly accounts for both one-time completions and recurring occurrence completions.
 */
export function getTasksForDate(
  tasks: Task[],
  date: Date,
  completions: TaskCompletion[]
): { task: Task; completed: boolean; occurrenceDate: string }[] {
  const dateStr = format(date, 'yyyy-MM-dd');
  const isTodayCheck = isToday(date);

  return tasks
    .filter((t) => {
      if (t.scheduled_date) {
        return isTaskScheduledForDate(t, date);
      }
      
      // Backward compatibility for old tasks without scheduled_date:
      // Show in Today's list if it's currently pending, or if it was completed today.
      if (isTodayCheck) {
        return !t.completed || (t.completed_at && t.completed_at.startsWith(dateStr));
      }
      
      // If querying other dates, show completed on their completion date, or pending on their creation date
      if (t.completed && t.completed_at) {
        return t.completed_at.startsWith(dateStr);
      }
      return t.created_at.startsWith(dateStr);
    })
    .map((t) => {
      let completed = false;
      if (t.recurrence_type && t.recurrence_type !== 'none') {
        completed = completions.some(
          (c) => c.task_id === t.id && c.occurrence_date === dateStr
        );
      } else {
        completed = t.completed;
      }
      return { task: t, completed, occurrenceDate: dateStr };
    });
}
