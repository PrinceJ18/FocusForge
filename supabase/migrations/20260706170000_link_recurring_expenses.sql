-- Migration to link expenses to recurring_expenses to prevent duplicate confirmation records
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS recurring_expense_id uuid REFERENCES recurring_expenses(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS recurring_occurrence_date date;

-- Index to query linked recurring expenses quickly
CREATE INDEX IF NOT EXISTS expenses_recurring_expense_idx 
ON expenses(recurring_expense_id, recurring_occurrence_date);
