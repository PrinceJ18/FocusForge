import { supabase } from './supabase';
import { useStore } from '../store/useStore';
import { getLevelInfo } from './levels';

export interface AppEvent {
  id: string;
  user_id: string;
  timestamp: string;
  type: string; // e.g. 'pomodoro_completed', 'task_completed', 'expense_added', 'badge_earned', 'achievement_unlocked', 'level_up', etc.
  category: 'focus' | 'finance' | 'tasks' | 'xp' | 'achievements' | 'reports' | 'streak' | 'levels' | 'system';
  reference_id?: string;
  metadata: {
    amount?: number;
    title?: string;
    xpEarned?: number;
    badgeId?: string;
    badgeName?: string;
    achievementId?: string;
    achievementTitle?: string;
    level?: number;
    description?: string;
    [key: string]: any;
  };
}

export interface AchievementConfig {
  id: string;
  title: string;
  description: string;
  category: AppEvent['category'];
  xpReward: number;
  icon: string;
  targetValue: number;
  currentValue: (stats: any) => number;
}

export interface MilestoneConfig {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AppEvent['category'];
  targetValue: number;
  currentValue: (stats: any) => number;
}

// 6 Achievements from prompt
export const ACHIEVEMENTS: AchievementConfig[] = [
  {
    id: 'ach_100_pomodoros',
    title: '100 Pomodoros',
    description: 'Complete 100 focus sessions',
    category: 'focus',
    xpReward: 100,
    icon: '🏆',
    targetValue: 100,
    currentValue: (stats) => stats.totalFocusSessions,
  },
  {
    id: 'ach_30_day_streak',
    title: '30 Day Streak',
    description: 'Maintain a 30 day daily streak',
    category: 'streak',
    xpReward: 250,
    icon: '🔥',
    targetValue: 30,
    currentValue: (stats) => stats.longestStreak,
  },
  {
    id: 'ach_save_10k',
    title: 'Saved ₹10,000',
    description: 'Accumulate ₹10,000 or more in total savings goals',
    category: 'finance',
    xpReward: 200,
    icon: '💰',
    targetValue: 10000,
    currentValue: (stats) => stats.totalSavings,
  },
  {
    id: 'ach_level_10',
    title: 'Level 10',
    description: 'Reach Level 10',
    category: 'levels',
    xpReward: 500,
    icon: '⭐',
    targetValue: 10,
    currentValue: (stats) => stats.currentLevel,
  },
  {
    id: 'ach_500_tasks',
    title: 'Completed 500 Tasks',
    description: 'Complete 500 tasks',
    category: 'tasks',
    xpReward: 300,
    icon: '🎯',
    targetValue: 500,
    currentValue: (stats) => stats.completedTasks,
  },
  {
    id: 'ach_250_hours_focus',
    title: 'Studied 250 Hours',
    description: 'Spend 250 hours in focus sessions',
    category: 'focus',
    xpReward: 400,
    icon: '📚',
    targetValue: 250,
    currentValue: (stats) => Math.floor(stats.totalFocusMinutes / 60),
  },
  {
    id: 'ach_first_subscription',
    title: 'First Subscription',
    description: 'Track at least one active subscription or bill',
    category: 'finance',
    xpReward: 100,
    icon: '💳',
    targetValue: 1,
    currentValue: (stats) => stats.activeRecurringCount,
  },
  {
    id: 'ach_never_missed_payment',
    title: 'Never Missed Payment',
    description: 'Complete payments without skipping',
    category: 'finance',
    xpReward: 150,
    icon: '✅',
    targetValue: 1,
    currentValue: (stats) => (stats.skippedPaymentCount === 0 && stats.paymentCompletedCount >= 1 ? 1 : 0),
  },
  {
    id: 'ach_12_months_on_time',
    title: '12 Months On Time',
    description: 'Complete 12 recurring bill payments',
    category: 'finance',
    xpReward: 300,
    icon: '📅',
    targetValue: 12,
    currentValue: (stats) => stats.paymentCompletedCount,
  },
  {
    id: 'ach_subscription_master',
    title: 'Subscription Master',
    description: 'Track 5 or more active subscriptions or bills',
    category: 'finance',
    xpReward: 200,
    icon: '👑',
    targetValue: 5,
    currentValue: (stats) => stats.activeRecurringCount,
  },
  {
    id: 'ach_budget_planner',
    title: 'Budget Planner',
    description: 'Define a monthly budget of ₹10,000 or more',
    category: 'finance',
    xpReward: 100,
    icon: '📊',
    targetValue: 10000,
    currentValue: (stats) => stats.budgetLimit,
  },
  {
    id: 'ach_savings_expert',
    title: 'Savings Expert',
    description: 'Complete 3 savings goals',
    category: 'finance',
    xpReward: 250,
    icon: '🐷',
    targetValue: 3,
    currentValue: (stats) => stats.completedSavingsCount,
  },
];

// 6 Milestones from prompt
export const MILESTONES: MilestoneConfig[] = [
  {
    id: 'mile_100_hours',
    title: '100 Hours Focus',
    description: 'Focus for 100 hours',
    icon: '🧠',
    category: 'focus',
    targetValue: 100,
    currentValue: (stats) => Math.floor(stats.totalFocusMinutes / 60),
  },
  {
    id: 'mile_500_tasks',
    title: '500 Tasks Completed',
    description: 'Successfully complete 500 tasks',
    icon: '✅',
    category: 'tasks',
    targetValue: 500,
    currentValue: (stats) => stats.completedTasks,
  },
  {
    id: 'mile_1000_xp',
    title: '1,000 XP Earned',
    description: 'Cross 1,000 lifetime XP',
    icon: '⚡',
    category: 'xp',
    targetValue: 1000,
    currentValue: (stats) => stats.totalXP,
  },
  {
    id: 'mile_100_sessions',
    title: '100 Focus Sessions',
    description: 'Log 100 focus sessions',
    icon: '⏱️',
    category: 'focus',
    targetValue: 100,
    currentValue: (stats) => stats.totalFocusSessions,
  },
  {
    id: 'mile_100_expenses',
    title: '100 Expenses Logged',
    description: 'Record 100 expenses',
    icon: '💳',
    category: 'finance',
    targetValue: 100,
    currentValue: (stats) => stats.totalExpensesCount,
  },
  {
    id: 'mile_100_days',
    title: '100 Days Using FocusForge',
    description: 'Be a member for 100 days',
    icon: '📅',
    category: 'system',
    targetValue: 100,
    currentValue: (stats) => stats.daysActive,
  },
];

export async function logEvent(
  type: string,
  category: AppEvent['category'],
  referenceId?: string,
  metadata: AppEvent['metadata'] = {}
) {
  const store = useStore.getState();
  const userId = store.user?.id;
  if (!userId) return;

  const event: AppEvent = {
    id: crypto.randomUUID(),
    user_id: userId,
    timestamp: new Date().toISOString(),
    type,
    category,
    reference_id: referenceId,
    metadata,
  };

  // 1. Log locally
  store.addEventLocal(event);

  // 2. Sync to database
  try {
    const { error } = await supabase.from('events').insert({
      id: event.id,
      user_id: event.user_id,
      timestamp: event.timestamp,
      type: event.type,
      category: event.category,
      reference_id: event.reference_id,
      metadata: event.metadata,
    });
    if (error) {
      console.warn('Supabase event log warning:', error.message);
    }
  } catch (err) {
    console.warn('Supabase event log error, using local fallback:', err);
  }

  // 3. Post-event checks (achievements, milestones, badges)
  // Skip checking if this event itself was unlocking a badge or achievement to prevent recursive loops
  if (type !== 'badge_earned' && type !== 'achievement_unlocked' && type !== 'milestone_unlocked') {
    await checkUnlocksAndMilestones();
  }
}

/**
 * Checks all achievements, milestones, and badges. Unlocks any new ones,
 * adds XP, logs the event, and triggers global notifications.
 */
export async function checkUnlocksAndMilestones() {
  const store = useStore.getState();
  if (!store.user) return;

  // Gather stats for evaluation
  const totalFocusSessions = store.focusSessions.reduce((sum, s) => sum + (s.sessions_count || 1), 0);
  const totalFocusMinutes = store.focusSessions.reduce((sum, s) => sum + s.minutes, 0);
  const completedTasks = store.tasks.filter(t => t.completed).length;
  const totalExpensesCount = store.expenses.length;
  const totalSavings = store.profile.total_savings || store.savingsGoals.reduce((sum, g) => sum + g.current_amount, 0);

  // Calculate longest streak from timeline or use current streak as baseline
  const longestStreak = Math.max(store.profile.streak || 0, 1);

  // Days since joined
  const createdDate = store.user.created_at ? new Date(store.user.created_at) : new Date();
  const daysActive = Math.max(1, Math.ceil((new Date().getTime() - createdDate.getTime()) / (1000 * 3600 * 24)));

  const existingEvents = store.events || [];

  const activeRecurringCount = store.recurringExpenses.filter(r => r.status === 'active').length;
  const paymentCompletedCount = existingEvents.filter(e => e.type === 'payment_completed').length;
  const skippedPaymentCount = existingEvents.filter(e => e.type === 'payment_skipped').length;
  const budgetLimit = store.profile.monthly_budget;
  const completedSavingsCount = store.savingsGoals.filter(g => g.current_amount >= g.target_amount).length;

  const stats = {
    totalFocusSessions,
    totalFocusMinutes,
    completedTasks,
    totalExpensesCount,
    totalSavings,
    longestStreak,
    daysActive,
    totalXP: store.profile.xp,
    currentLevel: getLevelInfo(store.profile.xp).level,
    activeRecurringCount,
    paymentCompletedCount,
    skippedPaymentCount,
    budgetLimit,
    completedSavingsCount,
  };


  // Check Achievements
  for (const ach of ACHIEVEMENTS) {
    const isAlreadyUnlocked = existingEvents.some(
      (e) => e.type === 'achievement_unlocked' && e.metadata.achievementId === ach.id
    );

    if (!isAlreadyUnlocked && ach.currentValue(stats) >= ach.targetValue) {
      // Guest mode fallback
      if (!store.user || store.user.id === 'local') {
        const unlockTime = new Date().toISOString();
        await logEvent('achievement_unlocked', 'achievements', ach.id, {
          achievementId: ach.id,
          achievementTitle: ach.title,
          xpEarned: ach.xpReward,
          description: `Unlocked: ${ach.description}`,
        });
        await store.addXP(ach.xpReward);
        store.showNotification({
          type: 'achievement',
          title: ach.title,
          message: ach.description,
          xp: ach.xpReward,
        });
        continue;
      }

      // Authenticated Authoritative Flow
      // Skip ach_500_tasks as it's not implemented yet
      if (ach.id === 'ach_500_tasks') continue;

      try {
        const { data, error } = await supabase.rpc('unlock_achievement', {
          p_achievement_id: ach.id
        });

        if (error) {
          console.warn(`Failed to unlock achievement ${ach.id}:`, error.message);
          continue;
        }

        const result = data as any;

        if (result.unlocked) {
          const latestStore = useStore.getState();
          // Synchronize Authoritative Profile XP
          latestStore.setProfileXPAuthoritative(result.total_xp);

          if (result.already_unlocked) {
            // Do not require a canonical event fetch
            // Do not create a local duplicate event
            // Existing hydrated legacy events remain the compatibility source for the UI
          } else {
            // Fetch authoritative event to inject into Zustand
            const { data: dbEvents, error: dbError } = await supabase
              .from('events')
              .select('*')
              .eq('user_id', latestStore.user?.id)
              .eq('type', 'achievement_unlocked')
              .eq('reference_id', ach.id)
              .order('timestamp', { ascending: false })
              .limit(1);

            if (!dbError && dbEvents && dbEvents.length > 0) {
              const authEvent = dbEvents[0];
              if (authEvent.metadata?.xp_earned != null) {
                // Prevent duplicate insertion
                if (!latestStore.events.some((e: any) => e.id === authEvent.id)) {
                  latestStore.addEventLocal(authEvent);
                }
              } else {
                console.warn(`Authoritative event missing xp_earned for ${ach.id}`);
              }
            } else {
              console.warn(`Failed to fetch authoritative event for newly unlocked ${ach.id}`);
            }

            latestStore.showNotification({
              type: 'achievement',
              title: ach.title,
              message: ach.description,
              xp: result.xp_earned,
            });
          }
        }
      } catch (err) {
        console.warn(`Error invoking unlock_achievement for ${ach.id}:`, err);
      }
    }
  }

  // Check Milestones
  for (const mile of MILESTONES) {
    const isAlreadyUnlocked = existingEvents.some(
      (e) => e.type === 'milestone_unlocked' && e.metadata.milestoneId === mile.id
    );

    if (!isAlreadyUnlocked && mile.currentValue(stats) >= mile.targetValue) {
      if (!store.user || store.user.id === 'local') {
        // Guest mode fallback
        await logEvent('milestone_unlocked', mile.category, mile.id, {
          milestoneId: mile.id,
          milestoneTitle: mile.title,
          description: `Reached Milestone: ${mile.description}`,
        });
        store.showNotification({
          type: 'challenge',
          title: mile.title,
          message: mile.description,
        });
      } else {
        // Authenticated flow
        try {
          const { data, error } = await supabase.rpc('unlock_milestone', {
            p_milestone_id: mile.id,
            p_title: mile.title,
            p_description: mile.description,
            p_category: mile.category
          });

          if (error) {
            console.warn(`Failed to unlock milestone ${mile.id}:`, error.message);
            continue;
          }

          const result = data as any;
          if (result.unlocked && !result.already_unlocked) {
            // Fetch the authoritative event to inject into Zustand
            const { data: dbEvents, error: dbError } = await supabase
              .from('events')
              .select('*')
              .eq('id', result.event_id)
              .single();

            if (!dbError && dbEvents) {
               const latestStore = useStore.getState();
               if (!latestStore.events.some((e: any) => e.id === dbEvents.id)) {
                 latestStore.addEventLocal(dbEvents);
               }
            }
            
            store.showNotification({
              type: 'challenge',
              title: mile.title,
              message: mile.description,
            });
          }
        } catch (err) {
          console.warn(`Error invoking unlock_milestone for ${mile.id}:`, err);
        }
      }
    }
  }
}
