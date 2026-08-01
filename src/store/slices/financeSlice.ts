import { StateCreator } from 'zustand';
import { AppState, FinanceSlice } from './types';

export const createFinanceSlice: StateCreator<AppState, [], [], FinanceSlice> = (set) => ({
  expenses: [],
  savingsGoals: [],
  customCategories: [],
  recurringExpenses: [],
  splits: [],
  
  setExpenses: (expenses) => set({ expenses }),
  setSavingsGoals: (savingsGoals) => set({ savingsGoals }),
  setCustomCategories: (customCategories) => set({ customCategories }),
  setRecurringExpenses: (recurringExpenses) => set({ recurringExpenses }),
  setSplits: (splits) => set({ splits }),

  addExpenseLocal: (expense) => set((s) => ({ expenses: [expense, ...s.expenses] })),
  removeExpenseLocal: (id) => set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),
  
  addRecurringExpenseLocal: (expense) => set((s) => ({ recurringExpenses: [expense, ...s.recurringExpenses] })),
  updateRecurringExpenseLocal: (id, updates) => set((s) => ({
    recurringExpenses: s.recurringExpenses.map((re) => re.id === id ? { ...re, ...updates } : re)
  })),
  removeRecurringExpenseLocal: (id) => set((s) => ({
    recurringExpenses: s.recurringExpenses.filter((re) => re.id !== id)
  })),

  addSplitLocal: (split) => set((s) => ({ splits: [split, ...s.splits] })),
  removeSplitLocal: (id) => set((s) => ({ splits: s.splits.filter((sp) => sp.id !== id) })),
});
