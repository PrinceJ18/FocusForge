import { StateCreator } from 'zustand';
import { AppState, AuthSlice, Profile } from './types';
import { logEvent } from '../../lib/events';

export const defaultProfile: Profile = {
  xp: 0,
  streak: 0,
  last_active_date: '',
  monthly_budget: 10000,
  total_savings: 0,
  badges: [],
  display_name: '',
  avatar_url: '',
  daily_challenge_claims: {
    date: '',
    claimed: [],
  },
};

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set, get) => ({
  user: null,
  profile: defaultProfile,
  setUser: (user) => {
    set({ user });
    get().syncUserTimerState(user?.id || null);
  },
  updateProfile: (updates) => set((s) => ({ profile: { ...s.profile, ...updates } })),
  setProfileXPAuthoritative: (totalXP) => {
    const { profile } = get();
    const oldLevel = Math.floor(profile.xp / 100) + 1;
    const newLevel = Math.floor(totalXP / 100) + 1;
    
    set({
      profile: {
        ...profile,
        xp: totalXP
      }
    });

    if (newLevel > oldLevel) {
      logEvent('level_up', 'levels', undefined, { level: newLevel });

      get().showNotification({
        type: 'level',
        title: `Level Up!`,
        message: `Congratulations! You reached Level ${newLevel}!`,
      });
    }
  },
  addXP: async (amount) => {
    const { profile, user } = get();

    if (user && user.id !== 'local') {
      console.warn('addXP called in authenticated mode. XP must be calculated server-side.');
      return;
    }

    const oldLevel = Math.floor(profile.xp / 100) + 1;
    const newXP = profile.xp + amount;
    const newLevel = Math.floor(newXP / 100) + 1;

    set({
      profile: {
        ...profile,
        xp: newXP,
      },
    });

    // Log XP event
    logEvent('xp_earned', 'xp', undefined, { xpEarned: amount });

    if (newLevel > oldLevel) {
      logEvent('level_up', 'levels', undefined, { level: newLevel });

      get().showNotification({
        type: 'level',
        title: `Level Up!`,
        message: `Congratulations! You reached Level ${newLevel}!`,
      });
    }
  },
});
