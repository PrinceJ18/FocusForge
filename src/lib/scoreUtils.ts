import { Task, FocusSession, Expense, SavingsGoal, Profile } from '../store/useStore';

export interface ProductivityScoreParams {
  completedTasks: number;
  totalTasks: number;
  focusMinutes: number;
  focusGoal: number;
  streak: number;
  hasActivity: boolean;
  budgetHealth: 'Healthy' | 'Warning' | 'Critical' | 'Unknown';
  challengeCompleted: boolean;
}

export function calculateProductivityScore(params: ProductivityScoreParams): { score: number; label: string } {
  // Prevent NaN/Infinity
  const completed = Math.max(0, params.completedTasks || 0);
  const total = Math.max(0, params.totalTasks || 0);
  
  // 1. Task Completion (40%)
  let taskScore = 0;
  if (total > 0) {
    taskScore = Math.min(40, (completed / total) * 40);
  }

  // 2. Focus Performance (30%)
  const focus = Math.max(0, params.focusMinutes || 0);
  const goal = Math.max(1, params.focusGoal || 120); // fallback to 120
  const focusScore = Math.min(30, (focus / goal) * 30);

  // 3. Consistency (15%)
  const streak = Math.max(0, params.streak || 0);
  let consistencyScore = 0;
  consistencyScore += Math.min(10, streak * 2);
  if (params.hasActivity) consistencyScore += 5;
  consistencyScore = Math.min(15, consistencyScore);

  // 4. Financial Discipline (10%)
  let financeScore = 0;
  if (params.budgetHealth === 'Healthy') financeScore = 10;
  else if (params.budgetHealth === 'Warning') financeScore = 5;

  // 5. Daily Challenge (5%)
  const challengeScore = params.challengeCompleted ? 5 : 0;

  // Final sum
  let rawScore = taskScore + focusScore + consistencyScore + financeScore + challengeScore;
  
  if (isNaN(rawScore) || rawScore < 0) rawScore = 0;
  if (rawScore > 100) rawScore = 100;

  const score = Math.round(rawScore);

  // Scoring Labels
  let label = 'Needs Improvement';
  if (score >= 81) label = 'Excellent';
  else if (score >= 61) label = 'Very Good';
  else if (score >= 41) label = 'Good';
  else if (score >= 21) label = 'Getting Started';

  return { score, label };
}

export interface FinancialScoreParams {
  totalSpent: number;
  monthlyBudget: number;
  totalExpensesCount: number;
  categoriesCount: number;
  savingsProgressPct: number; // 0 to 100
  hasSavingsGoals: boolean;
}

export function calculateFinancialHealthScore(params: FinancialScoreParams): { score: number; label: string } {
  const {
    totalSpent = 0,
    monthlyBudget = 0,
    totalExpensesCount = 0,
    categoriesCount = 0,
    savingsProgressPct = 0,
    hasSavingsGoals = false,
  } = params;

  // 1. Budget Adherence (40%)
  let budgetScore = 0;
  if (monthlyBudget > 0) {
    if (totalSpent <= monthlyBudget) {
      budgetScore = 40;
    } else {
      const overspendRatio = (totalSpent - monthlyBudget) / monthlyBudget;
      // up to 20% over budget (0.2) reduces score from 40 down to 0
      budgetScore = Math.max(0, 40 - (overspendRatio * 200));
    }
  } else {
    // Safe default if no budget is configured
    budgetScore = 20;
  }

  // 2. Expense Tracking Consistency (20%)
  let trackingScore = 0;
  if (totalExpensesCount >= 5) {
    trackingScore = 20;
  } else if (totalExpensesCount >= 1) {
    trackingScore = 10;
  } else {
    trackingScore = 0;
  }

  // 3. Savings Progress (20%)
  let savingsScore = 0;
  if (hasSavingsGoals) {
    savingsScore = Math.min(20, (savingsProgressPct / 100) * 20);
  } else {
    // Safe default if no savings goals exist
    savingsScore = 10;
  }

  // 4. Spending Balance (10%)
  let balanceScore = 0;
  if (categoriesCount >= 3) {
    balanceScore = 10;
  } else if (categoriesCount >= 1) {
    balanceScore = 5;
  } else {
    balanceScore = 0;
  }

  // 5. Financial Discipline (10%)
  let disciplineScore = 0;
  if (monthlyBudget > 0) {
    if (totalSpent <= monthlyBudget) {
      disciplineScore = 10;
    } else {
      disciplineScore = 0;
    }
  } else {
    // Safe default if no budget
    disciplineScore = 5;
  }

  // Final Score
  let rawScore = budgetScore + trackingScore + savingsScore + balanceScore + disciplineScore;
  
  if (isNaN(rawScore) || rawScore < 0) rawScore = 0;
  if (rawScore > 100) rawScore = 100;

  const score = Math.round(rawScore);

  // Health Labels
  let label = 'Critical';
  if (score >= 81) label = 'Excellent';
  else if (score >= 61) label = 'Healthy';
  else if (score >= 41) label = 'Fair';
  else if (score >= 21) label = 'Needs Attention';

  return { score, label };
}
