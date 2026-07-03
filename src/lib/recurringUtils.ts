import { addDays, addWeeks, addMonths, addYears, parseISO, format, isBefore } from 'date-fns';
import { supabase } from './supabase';
import { useStore, type RecurringExpense, type Expense } from '../store/useStore';
import { logEvent } from './events';

/**
 * Calculates the next billing date for a given current date and frequency.
 */
export function getNextPaymentDate(currentDateStr: string, frequency: string, customInterval = 30): string {
  try {
    const date = parseISO(currentDateStr);
    let nextDate = date;

    switch (frequency) {
      case 'daily':
        nextDate = addDays(date, 1);
        break;
      case 'weekly':
        nextDate = addWeeks(date, 1);
        break;
      case 'bi-weekly':
        nextDate = addWeeks(date, 2);
        break;
      case 'monthly':
        nextDate = addMonths(date, 1);
        break;
      case 'quarterly':
        nextDate = addMonths(date, 3);
        break;
      case 'half-yearly':
        nextDate = addMonths(date, 6);
        break;
      case 'yearly':
        nextDate = addYears(date, 1);
        break;
      case 'custom':
        nextDate = addDays(date, customInterval || 30);
        break;
      default:
        nextDate = addMonths(date, 1);
    }

    return format(nextDate, 'yyyy-MM-dd');
  } catch (err) {
    console.error('Error calculating next payment date:', err);
    return currentDateStr;
  }
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
  const nextPayDate = getNextPaymentDate(payDate, bill.frequency, bill.custom_interval);

  // 1. Add to normal expenses
  const newExpense: Expense = {
    id: crypto.randomUUID(),
    title: bill.name,
    amount: bill.amount,
    category: bill.category,
    note: `Recurring bill payment for ${bill.name}`,
    expense_date: payDate,
    created_at: new Date().toISOString(),
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
      });
    } catch (err) {
      console.warn('Failed to sync payment expense to database, local fallback active:', err);
    }
  }

  // 2. Update recurring expense schedule
  const updates = {
    payment_date: nextPayDate,
    last_payment_date: payDate,
    updated_at: new Date().toISOString(),
  };

  store.updateRecurringExpenseLocal(bill.id, updates);

  if (store.user) {
    try {
      await supabase.from('recurring_expenses').update({
        payment_date: updates.payment_date,
        last_payment_date: updates.last_payment_date,
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
  const nextPayDate = getNextPaymentDate(payDate, bill.frequency, bill.custom_interval);

  const updates = {
    payment_date: nextPayDate,
    updated_at: new Date().toISOString(),
  };

  store.updateRecurringExpenseLocal(bill.id, updates);

  if (store.user) {
    try {
      await supabase.from('recurring_expenses').update({
        payment_date: updates.payment_date,
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
      // Check if billing date is in the past or today
      try {
        const payDate = parseISO(bill.payment_date);
        const today = parseISO(todayStr);

        // Process if payment_date <= todayStr
        if (isBefore(payDate, today) || bill.payment_date === todayStr) {
          console.log(`Auto-confirming recurring payment for: ${bill.name}`);
          await payRecurringExpense(bill.id);
        }
      } catch (e) {
        console.error('Error processing auto-add bill:', e);
      }
    }
  }
}
