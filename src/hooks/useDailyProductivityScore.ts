import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { calculateProductivityScore } from '../lib/scoreUtils';
import { getTodayFocusMinutes, getTodayCompletedTasks } from '../lib/statsUtils';
import { isToday, parseISO } from 'date-fns';

export function useDailyProductivityScore() {
  const { tasks, focusSessions, profile, expenses, preferences, events } = useStore();

  return useMemo(() => {
    const todayCompleted = getTodayCompletedTasks(tasks);
    const todayTotal = tasks.filter(t => {
       // Completed or Won't Do tasks logged today
       if (t.status === 'completed' || t.status === 'wont_do') {
         return t.completed_at && isToday(parseISO(t.completed_at));
       }
       
       // Pending tasks
       // Ignore recurring pending tasks in this calculation (they are calculated dynamically elsewhere)
       if (t.recurrence_type && t.recurrence_type !== 'none') return false; 
       
       // For non-recurring pending tasks, only count them if their deadline has passed
       if (t.deadline) {
         return new Date(t.deadline) < new Date();
       }
       
       // If no deadline, it counts towards the total if it was scheduled for today or earlier
       if (t.scheduled_date) {
         const sched = parseISO(t.scheduled_date);
         return sched < new Date();
       }
       
       return false;
    }).length;

    const todayFocus = getTodayFocusMinutes(focusSessions);
    const focusGoal = preferences.default_daily_focus_goal || 120;

    const todayExpenses = expenses.filter(e => isToday(parseISO(e.expense_date)));
    const todaySpent = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Calculate monthly spent to determine budget health
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthExpenses = expenses.filter(e => e.expense_date.startsWith(currentMonth));
    const monthlySpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    let budgetHealth: 'Healthy' | 'Warning' | 'Critical' | 'Unknown' = 'Unknown';
    if (profile.monthly_budget > 0) {
      const budgetUsedPct = (monthlySpent / profile.monthly_budget) * 100;
      if (budgetUsedPct >= 100) budgetHealth = 'Critical';
      else if (budgetUsedPct >= 80) budgetHealth = 'Warning';
      else budgetHealth = 'Healthy';
    } else if (monthlySpent === 0) {
      budgetHealth = 'Healthy';
    }

    const hasActivity = todayCompleted > 0 || todayFocus > 0 || todaySpent > 0;
    
    // Check if daily challenge was completed today
    const challengeCompleted = events.some(e => 
      e.type === 'challenge_completed' && isToday(parseISO(e.timestamp))
    );

    return calculateProductivityScore({
      completedTasks: todayCompleted,
      totalTasks: Math.max(todayCompleted, todayTotal), // Ensure total is at least completed
      focusMinutes: todayFocus,
      focusGoal,
      streak: profile.streak || 0,
      hasActivity,
      budgetHealth,
      challengeCompleted
    });
  }, [tasks, focusSessions, profile, expenses, preferences, events]);
}
