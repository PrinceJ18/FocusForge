import { ArenaActivity } from './activityService';

export type NotificationEvent = {
  id: string;
  type: ArenaActivity['activity_type'];
  title: string;
  description: string | null;
  timestamp: number;
};

type NotificationListener = (event: NotificationEvent) => void;

class NotificationService {
  private listeners: Set<NotificationListener> = new Set();
  private processedActivityIds: Set<string> = new Set(); // Prevent duplicates

  subscribe(listener: NotificationListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(activity: ArenaActivity) {
    if (this.processedActivityIds.has(activity.id)) return;
    this.processedActivityIds.add(activity.id);

    // Only notify for specific high-value types
    const notifyTypes: ArenaActivity['activity_type'][] = [
      'weekly_champion',
      'monthly_champion',
      'friend_joined',
      'level_up',
      'streak_milestone',
      'arena_score_updated' // For personal best handling
    ];

    if (!notifyTypes.includes(activity.activity_type)) return;

    const event: NotificationEvent = {
      id: activity.id,
      type: activity.activity_type,
      title: activity.title,
      description: activity.description,
      timestamp: Date.now(),
    };

    this.listeners.forEach(listener => listener(event));
  }

  triggerCelebration(type: 'weekly_champion' | 'monthly_champion' | 'level_up' | 'new_badge' | 'personal_best') {
    // We can dispatch a custom event that a Celebration overlay component listens to
    window.dispatchEvent(new CustomEvent('arena_celebration', { detail: { type } }));
  }

  processIncomingActivities(activities: ArenaActivity[]) {
    activities.forEach(activity => {
      this.notify(activity);
      
      // Map to celebrations
      if (activity.activity_type === 'weekly_champion') this.triggerCelebration('weekly_champion');
      if (activity.activity_type === 'monthly_champion') this.triggerCelebration('monthly_champion');
      if (activity.activity_type === 'level_up') this.triggerCelebration('level_up');
      
      // Additional checks could go here for Personal Best via metadata
      if (activity.activity_type === 'arena_score_updated' && activity.metadata?.is_personal_best) {
        this.triggerCelebration('personal_best');
      }
    });
  }
}

export const notificationService = new NotificationService();
