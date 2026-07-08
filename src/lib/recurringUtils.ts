import { 
  addDays, addWeeks, addMonths, addYears, parseISO, format, 
  isBefore, getDaysInMonth, setDate, isAfter 
} from 'date-fns';
import { supabase } from './supabase';
import { useStore, type RecurringExpense, type Expense } from '../store/useStore';
import { logEvent } from './events';

/**
 * Calculates the next billing date for a given current date and frequency,
 * preserving the original start date billing day of month to avoid month-drift.
 */
export function calculateNextPaymentDate(
  bill: { start_date: string; frequency: string; custom_interval?: number | null },
  fromDateStr: string
): string {
  try {
    const fromDate = parseISO(fromDateStr);
    const startDate = parseISO(bill.start_date);
    const targetDay = isNaN(startDate.getDate()) ? fromDate.getDate() : startDate.getDate();
    let nextDate = fromDate;

    switch (bill.frequency) {
      case 'daily':
        nextDate = addDays(fromDate, 1);
        break;
      case 'weekly':
        nextDate = addWeeks(fromDate, 1);
        break;
      case 'bi-weekly':
        nextDate = addWeeks(fromDate, 2);
        break;
      case 'monthly': {
        const candidate = addMonths(fromDate, 1);
        const maxDays = getDaysInMonth(candidate);
        nextDate = setDate(candidate, Math.min(targetDay, maxDays));
        break;
      }
      case 'quarterly': {
        const candidate = addMonths(fromDate, 3);
        const maxDays = getDaysInMonth(candidate);
        nextDate = setDate(candidate, Math.min(targetDay, maxDays));
        break;
      }
      case 'half-yearly': {
        const candidate = addMonths(fromDate, 6);
        const maxDays = getDaysInMonth(candidate);
        nextDate = setDate(candidate, Math.min(targetDay, maxDays));
        break;
      }
      case 'yearly': {
        const candidate = addYears(fromDate, 1);
        const maxDays = getDaysInMonth(candidate);
        nextDate = setDate(candidate, Math.min(targetDay, maxDays));
        break;
      }
      case 'custom':
        nextDate = addDays(fromDate, bill.custom_interval || 30);
        break;
      default: {
        const candidate = addMonths(fromDate, 1);
        const maxDays = getDaysInMonth(candidate);
        nextDate = setDate(candidate, Math.min(targetDay, maxDays));
      }
    }

    return format(nextDate, 'yyyy-MM-dd');
  } catch (err) {
    console.error('Error calculating next payment date:', err);
    return fromDateStr;
  }
}

/**
 * Legacy wrapper for backward compatibility.
 */
export function getNextPaymentDate(currentDateStr: string, frequency: string, customInterval = 30): string {
  return calculateNextPaymentDate(
    { start_date: currentDateStr, frequency, custom_interval: customInterval },
    currentDateStr
  );
}

/**
 * Processes a recurring bill payment (Mark Paid).
 * Inserts the expense transaction, logs timeline events, triggers rewards, and updates the bill's schedule.
 */
export async function payRecurringExpense(recurringId: string, customDate?: string) {
  const store = useStore.getState();
  const bill = store.recurringExpenses.find(r => r.id === recurringId);
  if (!bill) return;

  const payDate = customDate || bill.payment_date;

  // Prevent duplicate confirmation for the same occurrence date
  const alreadyProcessed = store.expenses.some(
    e => e.recurring_expense_id === bill.id && e.recurring_occurrence_date === payDate
  );
  if (alreadyProcessed) {
    console.warn(`Payment occurrence on ${payDate} for bill ${bill.name} already processed.`);
    return;
  }

  const nextPayDate = calculateNextPaymentDate(bill, payDate);

  // 1. Add to normal expenses
  const newExpense: Expense = {
    id: crypto.randomUUID(),
    title: bill.name,
    amount: bill.amount,
    category: bill.category,
    note: `Recurring bill payment for ${bill.name}`,
    expense_date: payDate,
    created_at: new Date().toISOString(),
    recurring_expense_id: bill.id,
    recurring_occurrence_date: payDate,
  };

  store.addExpenseLocal(newExpense);

  if (store.user) {
    try {
      await supabase.from('expenses').insert({
        id: newExpense.id,
        user_id: store.user.id,
        title: newExpense.title,
        amount: newExpense.amount,
        category: newExpense.category,
        note: newExpense.note,
        expense_date: newExpense.expense_date,
        recurring_expense_id: newExpense.recurring_expense_id,
        recurring_occurrence_date: newExpense.recurring_occurrence_date,
      });
    } catch (err) {
      console.warn('Failed to sync payment expense to database, local fallback active:', err);
    }
  }

  // 2. Update recurring expense schedule, stopping if next date exceeds end_date
  let nextStatus = bill.status;
  if (bill.end_date) {
    try {
      const nextPayDateObj = parseISO(nextPayDate);
      const endDateObj = parseISO(bill.end_date);
      if (isAfter(nextPayDateObj, endDateObj)) {
        nextStatus = 'cancelled';
      }
    } catch (e) {
      console.error('Error parsing end_date check:', e);
    }
  }

  const updates = {
    payment_date: nextPayDate,
    last_payment_date: payDate,
    status: nextStatus,
    updated_at: new Date().toISOString(),
  };

  store.updateRecurringExpenseLocal(bill.id, updates);

  if (store.user) {
    try {
      await supabase.from('recurring_expenses').update({
        payment_date: updates.payment_date,
        last_payment_date: updates.last_payment_date,
        status: updates.status,
        updated_at: updates.updated_at,
      }).eq('id', bill.id);
    } catch (err) {
      console.warn('Failed to update recurring expense schedule in database:', err);
    }
  }

  // 3. Log event to timeline
  await logEvent('payment_completed', 'finance', bill.id, {
    title: bill.name,
    amount: bill.amount,
    description: `Payment completed for subscription/bill: ${bill.name} (-₹${bill.amount})`,
  });

  // 4. Trigger notification
  store.showNotification({
    type: 'goal',
    title: 'Bill Paid',
    message: `${bill.name} marked as paid. Expense added to budget!`,
  });
}

/**
 * Skip a recurring bill payment.
 * Logs a skip event and advances the billing date.
 */
export async function skipRecurringExpense(recurringId: string) {
  const store = useStore.getState();
  const bill = store.recurringExpenses.find(r => r.id === recurringId);
  if (!bill) return;

  const payDate = bill.payment_date;
  const nextPayDate = calculateNextPaymentDate(bill, payDate);

  let nextStatus = bill.status;
  if (bill.end_date) {
    try {
      const nextPayDateObj = parseISO(nextPayDate);
      const endDateObj = parseISO(bill.end_date);
      if (isAfter(nextPayDateObj, endDateObj)) {
        nextStatus = 'cancelled';
      }
    } catch (e) {
      console.error('Error parsing end_date check:', e);
    }
  }

  const updates = {
    payment_date: nextPayDate,
    status: nextStatus,
    updated_at: new Date().toISOString(),
  };

  store.updateRecurringExpenseLocal(bill.id, updates);

  if (store.user) {
    try {
      await supabase.from('recurring_expenses').update({
        payment_date: updates.payment_date,
        status: updates.status,
        updated_at: updates.updated_at,
      }).eq('id', bill.id);
    } catch (err) {
      console.warn('Failed to update recurring expense schedule in database:', err);
    }
  }

  // Log event
  await logEvent('payment_skipped', 'finance', bill.id, {
    title: bill.name,
    description: `Payment skipped for subscription/bill: ${bill.name}`,
  });

  store.showNotification({
    type: 'xp',
    title: 'Bill Skipped',
    message: `${bill.name} skipped. Moved to next billing cycle: ${nextPayDate}`,
  });
}

/**
 * Checks all active recurring expenses. Processes auto-adds that are due/overdue.
 */
export async function processAutoAddRecurringExpenses() {
  const store = useStore.getState();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  for (const bill of store.recurringExpenses) {
    if (bill.status === 'active' && bill.auto_add) {
      try {
        const payDate = parseISO(bill.payment_date);
        const today = parseISO(todayStr);

        // Process if payment_date <= todayStr
        if (isBefore(payDate, today) || bill.payment_date === todayStr) {
          await payRecurringExpense(bill.id);
        }
      } catch (e) {
        console.error('Error processing auto-add bill:', e);
      }
    }
  }
}
