import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { arenaService } from '../services/arenaService';
import { activityService } from '../services/activityService';
import { championService } from '../services/championService';
import { calculateProductivityScore } from '../lib/scoreUtils';
import { isSameWeek, isSameMonth, parseISO, startOfWeek, startOfMonth, format } from 'date-fns';

/**
 * Background engine that syncs the current user's productivity data
 * to their active arena's scores. Self-discovers the arena from
 * arena_members — no hardcoded arena ID needed.
 */
export function useArenaEngine() {
  const { user, profile, tasks, focusSessions, expenses, preferences, events } = useStore();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeArenaId, setActiveArenaId] = useState<string | null>(null);

  const currentLevel = Math.floor((profile.xp || 0) / 100) + 1;
  const prevLevel = useRef(currentLevel);
  const prevStreak = useRef(profile.streak);

  // Discover the user's active arena on mount and when user changes
  useEffect(() => {
    if (!user?.id) {
      setActiveArenaId(null);
      return;
    }

    (async () => {
      try {
        const { data } = await supabase
          .from('arena_members')
          .select('arena_id')
          .eq('user_id', user.id)
          .is('left_at', null)
          .limit(1)
          .maybeSingle();

        setActiveArenaId(data?.arena_id ?? null);
      } catch (err) {
        console.error('Arena discovery error:', err);
        setActiveArenaId(null);
      }
    })();
  }, [user?.id]);

  // Activity logging for level-ups, streaks, daily challenges
  useEffect(() => {
    if (!user?.id || !activeArenaId) return;

    if (currentLevel > prevLevel.current) {
      activityService.logActivity(activeArenaId, user.id, 'level_up', `Reached Level ${currentLevel}!`, null, { dedupe_key: `level_${currentLevel}` }).catch(console.error);
      prevLevel.current = currentLevel;
    }

    if (profile.streak && profile.streak > prevStreak.current) {
      if (profile.streak % 5 === 0) {
        activityService.logActivity(activeArenaId, user.id, 'streak_milestone', `Hit a ${profile.streak} day streak!`, null, { dedupe_key: `streak_${profile.streak}` }).catch(console.error);
      }
      prevStreak.current = profile.streak;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const todayChallenge = events.some(e => e.type === 'challenge_completed' && e.timestamp.startsWith(todayStr));
    if (todayChallenge) {
      activityService.logActivity(activeArenaId, user.id, 'daily_challenge_completed', 'Completed the Daily Challenge!', null, { dedupe_key: `challenge_${todayStr}` }).catch(console.error);
    }
  }, [currentLevel, profile.streak, events, activeArenaId, user?.id]);

  // Champion archiving (runs on login / page load)
  useEffect(() => {
    if (!user?.id || !activeArenaId) return;

    const now = new Date();
    if (now.getDay() === 1) {
      championService.calculateWeeklyChampion(activeArenaId).catch(console.error);
    }
    if (now.getDate() === 1) {
      championService.calculateMonthlyChampion(activeArenaId).catch(console.error);
    }
  }, [user?.id, activeArenaId]);

  // Score sync — debounced, syncs to all active arenas
  useEffect(() => {
    if (!user?.id || !activeArenaId) return;

    // We use a debounce to prevent excessive Supabase writes when local state changes rapidly
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        const today = new Date();
        const weeklyStartStr = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const monthlyStartStr = format(startOfMonth(today), 'yyyy-MM-dd');

        // Calculate Weekly Metrics
        const weeklyFocus = focusSessions
          .filter(s => isSameWeek(parseISO(s.session_date), today, { weekStartsOn: 1 }))
          .reduce((sum, s) => sum + (s.minutes || 0), 0);

        const weeklyTasksCompleted = tasks.filter(t => t.status === 'completed' && t.completed_at && isSameWeek(parseISO(t.completed_at), today, { weekStartsOn: 1 })).length;
        const weeklyTotalTasks = tasks.filter(t => isSameWeek(parseISO(t.created_at || new Date().toISOString()), today, { weekStartsOn: 1 })).length;

        const weeklyChallenges = events.filter(e => e.type === 'challenge_completed' && isSameWeek(parseISO(e.timestamp), today, { weekStartsOn: 1 })).length;

        const weeklyProdScore = calculateProductivityScore({
          completedTasks: weeklyTasksCompleted,
          totalTasks: Math.max(weeklyTasksCompleted, weeklyTotalTasks),
          focusMinutes: weeklyFocus,
          focusGoal: (preferences.default_daily_focus_goal || 120) * 7,
          streak: profile.streak || 0,
          hasActivity: weeklyTasksCompleted > 0 || weeklyFocus > 0,
          budgetHealth: 'Healthy', // Assuming healthy for weekly aggregation simplifications
          challengeCompleted: weeklyChallenges > 0
        }).score;

        const weeklyPoints = arenaService.calculateArenaScore({
          productivityScore: weeklyProdScore,
          focusMinutes: weeklyFocus,
          focusGoal: (preferences.default_daily_focus_goal || 120) * 7,
          tasksCompleted: weeklyTasksCompleted,
          totalTasks: Math.max(weeklyTasksCompleted, weeklyTotalTasks),
          dailyChallengesCompleted: weeklyChallenges
        });

        // Calculate Monthly Metrics
        const monthlyFocus = focusSessions
          .filter(s => isSameMonth(parseISO(s.session_date), today))
          .reduce((sum, s) => sum + (s.minutes || 0), 0);

        const monthlyTasksCompleted = tasks.filter(t => t.status === 'completed' && t.completed_at && isSameMonth(parseISO(t.completed_at), today)).length;
        const monthlyTotalTasks = tasks.filter(t => isSameMonth(parseISO(t.created_at || new Date().toISOString()), today)).length;
        
        const monthlyChallenges = events.filter(e => e.type === 'challenge_completed' && isSameMonth(parseISO(e.timestamp), today)).length;

        const monthlyProdScore = calculateProductivityScore({
          completedTasks: monthlyTasksCompleted,
          totalTasks: Math.max(monthlyTasksCompleted, monthlyTotalTasks),
          focusMinutes: monthlyFocus,
          focusGoal: (preferences.default_daily_focus_goal || 120) * 30,
          streak: profile.streak || 0,
          hasActivity: monthlyTasksCompleted > 0 || monthlyFocus > 0,
          budgetHealth: 'Healthy',
          challengeCompleted: monthlyChallenges > 0
        }).score;

        const monthlyPoints = arenaService.calculateArenaScore({
          productivityScore: monthlyProdScore,
          focusMinutes: monthlyFocus,
          focusGoal: (preferences.default_daily_focus_goal || 120) * 30,
          tasksCompleted: monthlyTasksCompleted,
          totalTasks: Math.max(monthlyTasksCompleted, monthlyTotalTasks),
          dailyChallengesCompleted: monthlyChallenges
        });

        // Sync to Supabase — only sync to real arenas from arena_members
        const { data: memberData } = await supabase
          .from('arena_members')
          .select('arena_id')
          .eq('user_id', user.id)
          .is('left_at', null);

        const arenaIdsToSync = memberData ? memberData.map(m => m.arena_id) : [];

        if (arenaIdsToSync.length === 0) return; // No active arenas — nothing to sync

        const scoresToUpsert = [];
        for (const aId of arenaIdsToSync) {
          scoresToUpsert.push(
            {
              arena_id: aId,
              user_id: user.id,
              period_type: 'weekly' as const,
              period_start: weeklyStartStr,
              focus_points: weeklyPoints.focus_points,
              task_points: weeklyPoints.task_points,
              challenge_points: weeklyPoints.challenge_points,
              streak_bonus: weeklyPoints.streak_bonus,
              last_calculated_at: new Date().toISOString()
            },
            {
              arena_id: aId,
              user_id: user.id,
              period_type: 'monthly' as const,
              period_start: monthlyStartStr,
              focus_points: monthlyPoints.focus_points,
              task_points: monthlyPoints.task_points,
              challenge_points: monthlyPoints.challenge_points,
              streak_bonus: monthlyPoints.streak_bonus,
              last_calculated_at: new Date().toISOString()
            }
          );
        }

        if (scoresToUpsert.length > 0) {
          const { error } = await supabase
            .from('arena_scores')
            .upsert(scoresToUpsert, { onConflict: 'arena_id,user_id,period_type,period_start' });
            
          if (error) {
            console.error('Arena Engine Sync Error:', error);
          }
        }
      } catch (err) {
        console.error('Arena Engine Sync Error:', err);
      }
    }, 2000); // 2 second debounce

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [profile, tasks, focusSessions, expenses, preferences, events, activeArenaId, user?.id]);
}
