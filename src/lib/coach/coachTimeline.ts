/**
 * Coach Engine — Timeline Generator (Phase 3.9.5 Task 7)
 *
 * Generates structured, chronological internal timeline events representing
 * milestones, trend shifts, risk alerts, habit discoveries, and achievements.
 *
 * Designed for future consumption by Reports, Analytics, and Notification feeds.
 * All functions are pure and deterministic.
 *
 * @module coach/coachTimeline
 */

import { format, parseISO, subDays } from 'date-fns';
import type {
  CoachInput,
  CoachTimelineEvent,
  CoachHabitAnalysis,
  CoachBehaviourTrends,
  CoachEarlyRiskReport,
} from './coachTypes';

/**
 * Generates a unified, chronological timeline of coaching events and insights.
 */
export function generateCoachTimeline(
  input: CoachInput,
  habits?: CoachHabitAnalysis,
  trends?: CoachBehaviourTrends,
  risks?: CoachEarlyRiskReport
): CoachTimelineEvent[] {
  const events: CoachTimelineEvent[] = [];
  const { profile, dailyGoalHistory, analytics, events: rawEvents } = input;
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  // 1. Ingest Raw System Events (unlocked badges, pomodoro milestones, challenges)
  rawEvents.slice(0, 30).forEach(evt => {
    try {
      const dateStr = evt.timestamp ? evt.timestamp.slice(0, 10) : todayStr;
      let eventType: CoachTimelineEvent['type'] = 'milestone';
      let title = evt.metadata?.title || 'Milestone Achieved';
      let description = evt.metadata?.description || `Activity logged in ${evt.category}`;
      let importance: CoachTimelineEvent['importance'] = 'info';

      if (evt.type === 'badge_earned' || evt.category === 'achievements') {
        eventType = 'achievement';
        title = `Badge Unlocked: ${evt.metadata?.badgeName || evt.metadata?.title || 'New Badge'}`;
        description = 'Earned through sustained focus and consistency.';
        importance = 'high';
      } else if (evt.type === 'level_up') {
        eventType = 'milestone';
        title = `Level Up! Reached Level ${evt.metadata?.level || ''}`;
        description = `Total XP reached ${profile.xp} XP.`;
        importance = 'high';
      }

      events.push({
        id: `timeline_event_${evt.id}`,
        timestamp: dateStr,
        type: eventType,
        category: (evt.category as any) || 'productivity',
        title,
        description,
        importance,
        icon: eventType === 'achievement' ? '🏆' : '⚡',
        metadata: { ...evt.metadata },
      });
    } catch {
      // Skip malformed event
    }
  });

  // 2. Daily Goal History Milestones & High-Performance Days
  dailyGoalHistory.forEach(h => {
    if (h.completionPct >= 100) {
      events.push({
        id: `timeline_perfect_day_${h.date}`,
        timestamp: h.date,
        type: 'milestone',
        category: 'habits',
        title: 'Perfect Day: 100% Goals Completed',
        description: `Logged ${h.focusMinutes}m focus, completed ${h.tasksCompleted} tasks with perfect daily discipline.`,
        importance: 'medium',
        icon: '🎯',
        metadata: { focusMinutes: h.focusMinutes, tasksCompleted: h.tasksCompleted },
      });
    } else if (h.focusMinutes >= 240) {
      events.push({
        id: `timeline_marathon_focus_${h.date}`,
        timestamp: h.date,
        type: 'milestone',
        category: 'focus',
        title: `Deep Work Marathon (${Math.round(h.focusMinutes / 60)}h ${h.focusMinutes % 60}m)`,
        description: `Exceptional focus output recorded on ${h.date}.`,
        importance: 'info',
        icon: '⏱️',
        metadata: { focusMinutes: h.focusMinutes },
      });
    }
  });

  // 3. Current Trend Shifts
  if (trends) {
    if (trends.focus.direction === 'improving' && trends.focus.magnitudePct >= 15) {
      events.push({
        id: `timeline_trend_focus_surge_${todayStr}`,
        timestamp: todayStr,
        type: 'trend_shift',
        category: 'focus',
        title: `Focus Output Surge (+${trends.focus.magnitudePct}%)`,
        description: trends.focus.summary,
        importance: 'medium',
        icon: '📈',
        metadata: { magnitudePct: trends.focus.magnitudePct },
      });
    }

    if (trends.finance.direction === 'declining' && trends.finance.magnitudePct >= 20) {
      events.push({
        id: `timeline_trend_spend_increase_${todayStr}`,
        timestamp: todayStr,
        type: 'trend_shift',
        category: 'finance',
        title: `Spending Surge Warning (+${trends.finance.magnitudePct}%)`,
        description: trends.finance.summary,
        importance: 'high',
        icon: '💸',
        metadata: { magnitudePct: trends.finance.magnitudePct },
      });
    }
  }

  // 4. Habit Discoveries
  if (habits) {
    events.push({
      id: `timeline_habit_prime_window_${todayStr}`,
      timestamp: todayStr,
      type: 'habit_formed',
      category: 'productivity',
      title: `Prime Focus Window Discovered: ${habits.bestFocusHour.timeWindow}`,
      description: habits.primaryHabitStrength,
      importance: 'info',
      icon: '🧠',
      metadata: { bestHour: habits.bestFocusHour.timeWindow, bestWeekday: habits.bestWeekday.dayName },
    });
  }

  // 5. Active Risk Events
  if (risks && risks.topCriticalRisks.length > 0) {
    risks.topCriticalRisks.forEach(r => {
      events.push({
        id: `timeline_risk_${r.id}_${todayStr}`,
        timestamp: todayStr,
        type: 'risk_detected',
        category: r.category,
        title: r.title,
        description: r.description,
        importance: r.severity,
        icon: r.icon,
        metadata: { probability: r.probability || 'high' },
      });
    });
  }

  // Sort descending chronologically (most recent first)
  return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
