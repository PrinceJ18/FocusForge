-- =============================================================================
-- MIGRATION: Recurring Bill Payment Uniqueness Constraint
-- =============================================================================
-- Purpose: Prevent duplicate payment records for the same recurring bill occurrence.
--
-- Context: The frontend already checks for duplicates via Zustand state, but this
-- is insufficient after page reload or across devices. This constraint ensures
-- that at most ONE expense row can exist for a given (recurring_expense_id,
-- recurring_occurrence_date) pair at the database level.
--
-- Safety: Uses a partial unique index (WHERE recurring_expense_id IS NOT NULL)
-- so normal expenses without a recurring_expense_id are completely unaffected.
--
-- Idempotent: Uses IF NOT EXISTS.
-- Non-destructive: Does not alter or drop any existing data or columns.
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_recurring_occurrence_unique
  ON public.expenses (recurring_expense_id, recurring_occurrence_date)
  WHERE recurring_expense_id IS NOT NULL;
