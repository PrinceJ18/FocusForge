import { format, getDaysInMonth, getDate } from 'date-fns';
import type { Expense, RecurringExpense } from '../store/useStore';
import { isFixedRecurringExpense } from './statistics/expenseClassification';

export interface FinancialState {
  // 1. Paid Spending (Actuals)
  monthlySpent: number;
  monthlyVariableSpent: number;
  monthlyRecurringPaidSpent: number;
  todaySpent: number;

  // 2. Unpaid Bill Reservations (Obligations)
  reservedBillsAmount: number;
  overdueBillsAmount: number;
  upcomingBillsAmount: number; // Only upcoming in the CURRENT month
  
  // 3. Budgets & Limits
  monthlyBudget: number;
  rawRemainingBudget: number;
  availableBudget: number;
  budgetDeficit: number;
  discretionaryRemainingBudget: number;
  dailyAllowance: number;
  
  // 4. Progress & Forecast
  budgetUtilizationPct: number;
  isBudgetExhausted: boolean;
  dailyVariableBurnRate: number;
  projectedMonthEndSpend: number;
  
  // 5. Exposing the raw arrays for UI use
  overdueBills: RecurringExpense[];
  upcomingBills: RecurringExpense[];
}

/**
 * The Canonical Financial Calculation Engine
 * 
 * Defines the Single Source of Truth for all derived financial states.
 * Eliminates duplicate/conflicting mathematical logic across Dashboard, Finance, Analytics, and Reports.
 */
export function calculateFinancialState(
  profileBudget: number,
  expenses: Expense[],
  recurringExpenses: RecurringExpense[],
  targetDate: Date = new Date()
): FinancialState {
  const targetDateStr = format(targetDate, 'yyyy-MM-dd');
  const targetYearMonth = targetDateStr.substring(0, 7);
  const daysInMonth = getDaysInMonth(targetDate);
  const currentDayOfMonth = getDate(targetDate);
  
  // Remaining days includes today. E.g. Oct 31, daysInMonth = 31, currentDay = 31. Remaining = 1.
  const remainingDays = Math.max(1, daysInMonth - currentDayOfMonth + 1);

  // --- A. ACTUAL PAID SPENDING ---
  // Only expenses where expense_date falls in the current month.
  const monthExpenses = expenses.filter(e => e.expense_date?.startsWith(targetYearMonth));
  const todayExpenses = expenses.filter(e => e.expense_date === targetDateStr);

  let monthlySpent = 0;
  let monthlyVariableSpent = 0;
  let monthlyRecurringPaidSpent = 0;

  monthExpenses.forEach(e => {
    monthlySpent += e.amount;
    if (isFixedRecurringExpense(e)) {
      monthlyRecurringPaidSpent += e.amount;
    } else {
      monthlyVariableSpent += e.amount;
    }
  });

  const todaySpent = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  // --- B. UNPAID BILL OBLIGATIONS ---
  // Active bills only
  const activeBills = recurringExpenses.filter(b => b.status === 'active');
  
  const overdueBills: RecurringExpense[] = [];
  const upcomingBills: RecurringExpense[] = []; // Only for current month

  activeBills.forEach(bill => {
    // Determine if this occurrence is already paid.
    // The canonical identity of a payment is (recurring_expense_id, recurring_occurrence_date).
    const alreadyPaid = expenses.some(
      e => e.recurring_expense_id === bill.id && e.recurring_occurrence_date === bill.payment_date
    );

    if (alreadyPaid) return; // Not an unpaid obligation.

    // If unpaid, where does it belong?
    const isOverdue = bill.payment_date < targetDateStr;
    const isUpcomingThisMonth = bill.payment_date >= targetDateStr && bill.payment_date.startsWith(targetYearMonth);

    if (isOverdue) {
      // Overdue bills NEVER disappear. They remain a debt until paid or skipped.
      overdueBills.push(bill);
    } else if (isUpcomingThisMonth) {
      // Upcoming bills are only reserved if they are scheduled for the current month.
      upcomingBills.push(bill);
    }
  });

  const overdueBillsAmount = overdueBills.reduce((sum, b) => sum + b.amount, 0);
  const upcomingBillsAmount = upcomingBills.reduce((sum, b) => sum + b.amount, 0);
  
  // Total reservation = Past unpaid debts + Upcoming obligations for this month.
  const reservedBillsAmount = overdueBillsAmount + upcomingBillsAmount;

  // --- C. DISCRETIONARY REMAINING BUDGET ---
  // MonthlyBudget - ActualSpending - UnpaidObligations
  const monthlyBudget = profileBudget || 0;
  
  // Phase 7.3.1A: Expose explicit raw, available, and deficit states
  const rawRemainingBudget = monthlyBudget - monthlySpent - reservedBillsAmount;
  const availableBudget = Math.max(0, rawRemainingBudget);
  const budgetDeficit = Math.max(0, -rawRemainingBudget);
  
  // Kept for backward compatibility
  const discretionaryRemainingBudget = availableBudget;

  // --- D. DAILY ALLOWANCE ---
  // Pacing target based on discretionary budget spread over remaining days.
  const dailyAllowance = monthlyBudget > 0 ? Math.round(discretionaryRemainingBudget / remainingDays) : 0;
  
  const isBudgetExhausted = monthlyBudget > 0 && discretionaryRemainingBudget === 0;

  // --- E. BUDGET UTILIZATION ---
  // We define budget utilization as the financial COMMITMENT utilization.
  // Commitment = Spent + Reserved.
  const totalCommitment = monthlySpent + reservedBillsAmount;
  const budgetUtilizationPct = monthlyBudget > 0 ? Math.min(100, Math.round((totalCommitment / monthlyBudget) * 100)) : 0;

  // --- F. FORECAST / PROJECTION ---
  // Projected Month-End Spend = Actual Paid Fixed Bills + Known Unpaid Obligations + Projected Variable Spend
  const elapsedDays = Math.max(1, currentDayOfMonth); // E.g., on 15th, 15 days elapsed.
  
  // Phase 7.3.4 Outlier Smoothing: Exclude massive one-off variable expenses (>15% of budget) from the daily mean.
  const outlierThreshold = monthlyBudget > 0 ? monthlyBudget * 0.15 : Infinity;
  let smoothedVariableSpent = 0;
  let outlierSpent = 0;
  
  monthExpenses.forEach(e => {
    if (!isFixedRecurringExpense(e)) {
      if (e.amount > outlierThreshold) {
        outlierSpent += e.amount;
      } else {
        smoothedVariableSpent += e.amount;
      }
    }
  });

  const dailyVariableBurnRate = smoothedVariableSpent / elapsedDays;
  
  // We project the smoothed variable burn rate across the full month, then re-add the outliers.
  const projectedVariableSpend = (dailyVariableBurnRate * daysInMonth) + outlierSpent;
  const projectedMonthEndSpend = Math.round(monthlyRecurringPaidSpent + reservedBillsAmount + projectedVariableSpend);

  return {
    monthlySpent,
    monthlyVariableSpent,
    monthlyRecurringPaidSpent,
    todaySpent,

    reservedBillsAmount,
    overdueBillsAmount,
    upcomingBillsAmount,

    monthlyBudget,
    rawRemainingBudget,
    availableBudget,
    budgetDeficit,
    discretionaryRemainingBudget,
    dailyAllowance,

    budgetUtilizationPct,
    isBudgetExhausted,
    dailyVariableBurnRate,
    projectedMonthEndSpend,

    overdueBills,
    upcomingBills
  };
}
